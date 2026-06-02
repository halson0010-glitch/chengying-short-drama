import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import { useEffect } from 'react';

type NotFoundPageProps = {
  title?: string;
};

export default function NotFoundPage({ title = '页面走丢了' }: NotFoundPageProps) {
  useEffect(() => {
    document.title = '页面不存在 - 橙影短剧';
  }, []);

  return (
    <PageContainer className="flex min-h-[58vh] items-center justify-center py-14">
      <div className="text-center">
        <p className="bg-accent bg-clip-text text-7xl font-bold text-transparent">404</p>
        <h1 className="mt-5 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-white/48">这里没有正在上演的故事，返回首页继续探索。</p>
        <GradientButton to="/" className="mt-8">
          返回首页
        </GradientButton>
      </div>
    </PageContainer>
  );
}
