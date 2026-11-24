import type { IKart } from '../core/types';
import { LapCheckoutGate } from './prankRules';

/** Local presentation only. Never stops a race, asks for payment data, or charges money. */
export class PlayerPranks {
  private readonly gate = new LapCheckoutGate();
  private readonly checkout = document.createElement('section');
  private readonly distraction = document.createElement('section');
  private readonly receipt = document.createElement('p');
  private readonly countdown = document.createElement('small');
  private checkoutUntil = 0;
  private raceTime = 0;

  constructor() {
    this.checkout.className = 'lap-checkout hidden';
    this.checkout.setAttribute('role', 'status');
    this.checkout.setAttribute('aria-label', 'Pretend lap checkout');
    const kicker = document.createElement('small'); kicker.textContent = 'A VERY REAL FAKE MICROTRANSACTION';
    const heading = document.createElement('h2'); heading.textContent = 'Finish line upgrade: the price of a coffee';
    const price = document.createElement('strong'); price.textContent = '$250,000 MIKECOINS';
    const note = document.createElement('p'); note.textContent = 'Imaginary currency. No real charges. One coffee, apparently the entire café.';
    const actions = document.createElement('div'); actions.className = 'prank-actions';
    for (const [label,result] of [
      ['PAY WITH MY DIGNITY', 'DECLINED: YOUR BANK STARTED LAUGHING.'],
      ['REPORT MIKE TO FINANCE', 'COMPLAINT RECEIVED. FREE TRIAL EXTENDED BY 12 CENTIMETRES.'],
    ]) {
      const b=document.createElement('button'); b.type='button'; b.textContent=label;
      b.addEventListener('click',()=>{this.receipt.textContent=result;this.checkoutUntil=this.raceTime+0.8;});
      actions.appendChild(b);
    }
    this.checkout.append(kicker,heading,price,note,actions,this.receipt,this.countdown);

    this.distraction.className='distraction hidden';
    this.distraction.setAttribute('aria-label','Distraction power-up');
    this.distraction.setAttribute('role','status');
    const card=document.createElement('div');card.className='distraction-card';
    const eyes=document.createElement('div');eyes.className='distraction-eyes';eyes.textContent='●     ●';
    const title=document.createElement('div');title.textContent='EYES ON THE ROAD';
    const censor=document.createElement('small');censor.textContent='[ EXTREMELY DISTRACTING RECTANGLE ]';
    const caption=document.createElement('p');caption.textContent='This advertisement has failed successfully.';
    card.append(eyes,title,censor,caption);
    this.distraction.append(card);
    document.body.append(this.checkout,this.distraction);
  }

  update(player: IKart, raceTime: number, _dt: number): void {
    this.raceTime=raceTime;
    const s=player.state;
    if(this.gate.shouldShow(s,raceTime)) {
      this.checkoutUntil=raceTime+2.8;
      this.receipt.textContent='';
    }
    const showCheckout=!s.finished && raceTime<this.checkoutUntil;
    this.checkout.classList.toggle('hidden',!showCheckout);
    if(showCheckout)this.countdown.textContent=`Auto-dismisses in ${Math.max(1,Math.ceil(this.checkoutUntil-raceTime))}s. Keep driving.`;
    this.distraction.classList.toggle('hidden',!s.isShrunk||s.finished);
  }

  dispose(): void {this.checkout.remove();this.distraction.remove();}
}
