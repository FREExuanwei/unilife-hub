import { Link } from 'react-router'
export default function NotFound() { return <div className="placeholder-page"><p className="eyebrow">404</p><h1>页面未找到</h1><section className="placeholder-panel"><p>这个地址暂时没有对应的页面。</p><Link to="/" className="back-link">返回首页</Link></section></div> }
