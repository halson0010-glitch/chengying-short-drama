import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash, role: 'admin' },
    create: { username, passwordHash, role: 'admin' },
  });

  const dramaCount = await prisma.drama.count();
  if (dramaCount === 0) {
    await prisma.drama.create({
      data: {
        title: '云端样片',
        subtitle: '后台接入后的第一部测试剧',
        description:
          '这是一条由后台 API 种子脚本创建的原创测试短剧，用于验证 H5 从后端读取剧目、剧集、封面和播放信息的完整流程。',
        totalEpisodes: 1,
        category: '都市',
        background: '现代',
        theme: '现言',
        audience: '女频',
        tags: JSON.stringify(['后台样片', '都市', '测试']),
        setting: JSON.stringify(['先婚后爱', '甜宠']),
        cast: JSON.stringify([{ actor: '程一橙', role: '林夏' }]),
        heat: '1.2万',
        status: 'published',
        episodes: {
          create: [{ episode: 1, title: '第一集', isFree: true }],
        },
      },
    });
  }

  console.log(`Admin user ready: ${username} / ${password}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
