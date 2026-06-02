export const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
export const FALLBACK_IMAGE_MODEL = 'gpt-image-1';
export const IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/generations';

const allowedQualities = new Set(['low', 'medium', 'high']);

export function normalizeImageQuality(value = 'low') {
  return allowedQualities.has(value) ? value : 'low';
}

export function maskOpenAIKey(apiKey = '') {
  if (!apiKey) return 'not-set';
  if (apiKey.length <= 8) return `${apiKey.slice(0, 2)}****`;
  const prefix = apiKey.startsWith('sk-proj-') ? 'sk-proj-' : `${apiKey.slice(0, 3)}-`;
  return `${prefix}****${apiKey.slice(-4)}`;
}

export function getRequestedImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function extractOpenAIError(bodyText) {
  const parsed = safeJsonParse(bodyText);
  const error = parsed?.error;
  return {
    raw: parsed,
    message: typeof error?.message === 'string' ? error.message : bodyText.slice(0, 1000),
    type: typeof error?.type === 'string' ? error.type : '',
    code: typeof error?.code === 'string' ? error.code : '',
    param: typeof error?.param === 'string' ? error.param : '',
  };
}

export function getStatusHint(status, error = {}) {
  if (status === 401) {
    return '401: API Key 可能无效、已删除、复制错误，或没有正确设置 OPENAI_API_KEY。';
  }
  if (status === 403) {
    return '403: 可能是项目/组织权限、模型权限不足，或组织验证未完成。';
  }
  if (status === 429) {
    return '429: 可能是额度不足、限速、usage tier 不足，或当前项目没有足够配额。';
  }
  if (status === 400) {
    return `400: 可能是 model、size、quality、prompt 参数不兼容。error code: ${error.code || 'unknown'}。`;
  }
  if (status === 404) {
    return '404: 可能是模型名不存在、接口路径不可用，或当前账号无权访问该模型。';
  }
  return '请检查网络、模型权限、请求参数、OpenAI 项目额度和组织设置。';
}

export function shouldTryFallbackModel(diagnostic) {
  const message = `${diagnostic.openaiMessage || ''} ${diagnostic.openaiType || ''} ${diagnostic.openaiCode || ''}`.toLowerCase();
  return (
    diagnostic.model === DEFAULT_IMAGE_MODEL &&
    (diagnostic.httpStatus === 403 ||
      diagnostic.httpStatus === 404 ||
      (diagnostic.httpStatus === 400 &&
        (message.includes('model_not_found') ||
          message.includes('model_not_supported') ||
          message.includes('model not found') ||
          message.includes('not found') ||
          message.includes('not supported') ||
          message.includes('does not exist'))))
  );
}

function makeRequestSummary({ model, prompt, size, quality }) {
  return {
    model,
    size,
    quality,
    promptLength: prompt.length,
    promptPreview: prompt.slice(0, 180),
  };
}

function makeHttpDiagnostic({ response, bodyText, request, apiKey, dramaId, kind }) {
  const error = extractOpenAIError(bodyText);
  return {
    category: 'http',
    httpStatus: response.status,
    httpStatusText: response.statusText,
    openaiMessage: error.message,
    openaiType: error.type,
    openaiCode: error.code,
    openaiParam: error.param,
    model: request.model,
    dramaId,
    kind,
    size: request.size,
    quality: request.quality,
    hasApiKey: Boolean(apiKey),
    maskedApiKey: maskOpenAIKey(apiKey),
    request: makeRequestSummary(request),
    hint: getStatusHint(response.status, error),
  };
}

function makeNetworkDiagnostic({ error, request, apiKey, dramaId, kind }) {
  return {
    category: 'network',
    errorName: error?.name || 'NetworkError',
    errorMessage: error?.message || String(error),
    model: request.model,
    dramaId,
    kind,
    size: request.size,
    quality: request.quality,
    hasApiKey: Boolean(apiKey),
    maskedApiKey: maskOpenAIKey(apiKey),
    request: makeRequestSummary(request),
    hint: 'fetch 抛出网络错误：可能是网络、代理、防火墙、DNS，或 OpenAI API 访问失败。',
  };
}

export function formatOpenAIImageDiagnostic(diagnostic, nextModel) {
  const lines = [
    '[chengying] OpenAI image generation diagnostic',
    `  category: ${diagnostic.category}`,
    `  dramaId: ${diagnostic.dramaId || 'test-image'}`,
    `  kind: ${diagnostic.kind || 'test'}`,
    `  model: ${diagnostic.model}`,
    `  size: ${diagnostic.size}`,
    `  quality: ${diagnostic.quality}`,
    `  has OPENAI_API_KEY: ${diagnostic.hasApiKey ? 'yes' : 'no'}`,
    `  masked key: ${diagnostic.maskedApiKey}`,
  ];

  if (diagnostic.category === 'http') {
    lines.push(
      `  HTTP status: ${diagnostic.httpStatus}`,
      `  HTTP statusText: ${diagnostic.httpStatusText || '(empty)'}`,
      `  OpenAI error message: ${diagnostic.openaiMessage || '(empty)'}`,
      `  OpenAI error type: ${diagnostic.openaiType || '(empty)'}`,
      `  OpenAI error code: ${diagnostic.openaiCode || '(empty)'}`,
      `  OpenAI error param: ${diagnostic.openaiParam || '(empty)'}`,
    );
  } else {
    lines.push(
      `  error.name: ${diagnostic.errorName}`,
      `  error.message: ${diagnostic.errorMessage}`,
    );
  }

  lines.push(`  request: ${JSON.stringify(diagnostic.request)}`, `  hint: ${diagnostic.hint}`);
  if (nextModel) lines.push(`  model fallback: ${diagnostic.model} failed, trying ${nextModel} next.`);
  return lines.join('\n');
}

function uniqueModels(requestedModel) {
  return [requestedModel || DEFAULT_IMAGE_MODEL];
}

export async function generateOpenAIImageWithDiagnostics({
  apiKey,
  requestedModel = DEFAULT_IMAGE_MODEL,
  prompt,
  size,
  quality = 'low',
  dramaId = 'test-image',
  kind = 'test',
  allowModelFallback = true,
  onAttemptFailure,
}) {
  if (!apiKey) {
    const diagnostic = {
      category: 'configuration',
      errorName: 'MissingOpenAIKey',
      errorMessage: 'OPENAI_API_KEY is not set.',
      model: requestedModel,
      dramaId,
      kind,
      size,
      quality,
      hasApiKey: false,
      maskedApiKey: maskOpenAIKey(apiKey),
      request: makeRequestSummary({ model: requestedModel, prompt, size, quality }),
      hint: '请在当前终端设置 OPENAI_API_KEY 后重试。PowerShell: $env:OPENAI_API_KEY="你的 key"',
    };
    const error = new Error('OPENAI_API_KEY is not set.');
    error.diagnostics = [diagnostic];
    throw error;
  }

  const models = uniqueModels(requestedModel);
  const diagnostics = [];

  for (let index = 0; index < models.length; index += 1) {
    const currentModel = models[index];
    const request = { model: currentModel, prompt, size, quality };

    try {
      const response = await fetch(IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        const diagnostic = makeHttpDiagnostic({ response, bodyText, request, apiKey, dramaId, kind });
        diagnostics.push(diagnostic);
        const fallbackModel =
          allowModelFallback && shouldTryFallbackModel(diagnostic) && !models.includes(FALLBACK_IMAGE_MODEL)
            ? FALLBACK_IMAGE_MODEL
            : '';
        onAttemptFailure?.(diagnostic, fallbackModel);
        if (fallbackModel) {
          models.push(fallbackModel);
          continue;
        }
        const error = new Error(`OpenAI image generation failed with HTTP ${response.status}.`);
        error.diagnostics = diagnostics;
        throw error;
      }

      const json = await response.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (b64) {
        return { buffer: Buffer.from(b64, 'base64'), model: currentModel, source: `openai:${currentModel}`, diagnostics };
      }

      const imageUrl = json?.data?.[0]?.url;
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          const diagnostic = makeHttpDiagnostic({
            response: imageResponse,
            bodyText: await imageResponse.text(),
            request,
            apiKey,
            dramaId,
            kind,
          });
          diagnostics.push(diagnostic);
          onAttemptFailure?.(diagnostic, '');
          const error = new Error(`Generated image download failed with HTTP ${imageResponse.status}.`);
          error.diagnostics = diagnostics;
          throw error;
        }
        return { buffer: Buffer.from(await imageResponse.arrayBuffer()), model: currentModel, source: `openai:${currentModel}`, diagnostics };
      }

      const diagnostic = {
        category: 'response',
        errorName: 'MissingImageData',
        errorMessage: 'OpenAI response did not include data[0].b64_json or data[0].url.',
        model: currentModel,
        dramaId,
        kind,
        size,
        quality,
        hasApiKey: Boolean(apiKey),
        maskedApiKey: maskOpenAIKey(apiKey),
        request: makeRequestSummary(request),
        hint: 'OpenAI 返回成功状态，但响应里没有图片数据。请检查接口模型和响应结构。',
      };
      diagnostics.push(diagnostic);
      onAttemptFailure?.(diagnostic, '');
      const error = new Error('OpenAI response did not include image data.');
      error.diagnostics = diagnostics;
      throw error;
    } catch (error) {
      if (error?.diagnostics) throw error;

      const diagnostic = makeNetworkDiagnostic({ error, request, apiKey, dramaId, kind });
      diagnostics.push(diagnostic);
      onAttemptFailure?.(diagnostic, '');
      const wrapped = new Error(`OpenAI image generation network error: ${diagnostic.errorMessage}`);
      wrapped.diagnostics = diagnostics;
      throw wrapped;
    }
  }

  const error = new Error('OpenAI image generation failed.');
  error.diagnostics = diagnostics;
  throw error;
}
