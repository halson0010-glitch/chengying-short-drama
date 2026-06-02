import PageContainer from '../common/PageContainer';
import Logo from './Logo';

const footerLinks = ['关于我们', '用户协议', '隐私政策', '联系方式', '违法和不良信息举报'];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[0.06] bg-[#0b0b0e] py-10 md:py-12">
      <PageContainer>
        <div className="flex flex-col justify-between gap-8 border-b border-white/[0.06] pb-9 md:flex-row md:items-center">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-white/45">打开橙影短剧 App，精彩故事随时开场</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55">
            {footerLinks.map((label) => (
              <a key={label} href="#" className="transition hover:text-accent">
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-8 space-y-2 text-xs text-white/35">
          <p>橙影映像文化科技有限公司（演示项目） | 客服邮箱：service@chengying.example</p>
          <p>网络视听内容展示备案占位 CY-2026-0001 | 本站内容及人物均为原创演示数据</p>
        </div>
      </PageContainer>
    </footer>
  );
}

