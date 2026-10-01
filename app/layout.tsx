import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Paysys | RAAST payment demo',description:'Explore simulated RAAST QR and Request to Pay checkout. No real payments.'};
export default function Layout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body><div className="demo-bar"><span className="pulse"/>Demo—no real payment <span className="bar-detail">A safe space to explore RAAST checkout</span></div><header><a className="brand" href="/" aria-label="Paysys home"><span className="brand-mark">p</span>paysys<span className="brand-labs">labs</span></a><span className="header-label">RAAST EXPERIENCE LAB <span className="tag">SIMULATION</span></span></header>{children}<footer><span>Powered by <b>Paysys Labs</b></span><span>Fictional accounts. Simulated outcomes. No money moves.</span><span>v0.1.0</span></footer></body></html>;
}
