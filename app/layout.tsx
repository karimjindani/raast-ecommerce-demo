import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Paysys | RAAST payment demo',description:'Explore simulated RAAST QR and Request to Pay checkout. No real payments.'};
export default function Layout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body><div className="demo-bar"><span className="pulse"/>Demo—no real payment <span className="bar-detail">A safe space to explore RAAST checkout</span></div><header><a className="brand" href="/" aria-label="Paysys home"><span className="brand-mark">p</span>paysys<span className="brand-labs">labs</span></a><span className="header-label">RAAST EXPERIENCE LAB <span className="tag">SIMULATION</span></span></header><div className="payment-brands" aria-label="RAAST and Tapsys"><img src="/brands/raast.png" alt="Raast - Pakistan instant payment system" width="180" height="135"/><span className="brand-divider" aria-hidden="true"/><img src="/brands/tapsys.png" alt="Tapsys" width="96" height="96"/></div>{children}<footer><span>Powered by <b>Paysys Labs</b></span><span>Fictional accounts. Simulated outcomes. No money moves.</span><span>v0.1.1</span></footer></body></html>;
}
