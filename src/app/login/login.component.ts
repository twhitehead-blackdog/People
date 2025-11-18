import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'pt-login',
  imports: [Card, Button, Toast],
  template: `
    <div
      class="w-full h-screen flex flex-col items-center justify-center p-4 relative animated-gradient-container"
      style="overflow: hidden;"
    >
      <div class="wave-layer wave-layer-1"></div>
      <div class="wave-layer wave-layer-2"></div>
      <div class="wave-layer wave-layer-3"></div>
      <div class="prism-effect prism-1"></div>
      <div class="prism-effect prism-2"></div>
      <div class="prism-effect prism-3"></div>
      <div class="prism-effect prism-4"></div>
      
      <p-toast />
      <div class="login-container flex flex-col items-center justify-center w-full h-full relative z-10">
        <div class="logo-wrapper mb-8 md:mb-12">
          <img src="images/blackdog.png" class="logo-image" alt="Black Dog Logo" />
        </div>
        
        <p-card class="login-card">
          <ng-template #title>
            <div class="card-title-wrapper">
              <div class="card-subtitle">Sistema de Gestión de Personal</div>
              <div class="card-title">Iniciar sesión</div>
            </div>
          </ng-template>
          <ng-template #subtitle>
            <div class="card-description">Ingresa con tu cuenta para continuar</div>
          </ng-template>

          <ng-template #footer>
            <div class="card-footer">
              <p-button 
                label="Entrar al dashboard" 
                (click)="signIn()" 
                icon="pi pi-sign-in"
                size="large"
                styleClass="login-button"
                [style]="{'background': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 'border': 'none'}"
              />
            </div>
          </ng-template>
        </p-card>
      </div>
    </div>
  `,
  styles: `
    .animated-gradient-container {
      background: #000000;
      position: relative;
      overflow: hidden;
    }
    
    .wave-layer {
      position: absolute;
      top: -20%;
      left: -20%;
      width: 140%;
      height: 140%;
      opacity: 1;
      will-change: transform, background-position;
    }
    
    .wave-layer-1 {
      background: radial-gradient(ellipse 1500px 1200px at 20% 50%, rgba(71, 71, 71, 1) 0%, rgba(71, 71, 71, 0.95) 8%, rgba(71, 71, 71, 0.85) 18%, rgba(38, 38, 38, 0.7) 35%, rgba(26, 26, 26, 0.5) 50%, rgba(13, 13, 13, 0.3) 65%, transparent 80%),
                  radial-gradient(ellipse 1400px 1100px at 80% 50%, rgba(55, 55, 55, 1) 0%, rgba(55, 55, 55, 0.95) 8%, rgba(55, 55, 55, 0.85) 18%, rgba(38, 38, 38, 0.7) 35%, rgba(26, 26, 26, 0.5) 50%, rgba(13, 13, 13, 0.3) 65%, transparent 80%),
                  radial-gradient(ellipse 1300px 1000px at 50% 20%, rgba(60, 60, 60, 1) 0%, rgba(60, 60, 60, 0.95) 10%, rgba(60, 60, 60, 0.85) 20%, rgba(38, 38, 38, 0.7) 38%, rgba(26, 26, 26, 0.5) 55%, rgba(13, 13, 13, 0.3) 70%, transparent 85%),
                  radial-gradient(ellipse 1200px 900px at 70% 80%, rgba(47, 47, 47, 1) 0%, rgba(47, 47, 47, 0.9) 12%, rgba(38, 38, 38, 0.75) 28%, rgba(26, 26, 26, 0.55) 45%, transparent 70%),
                  linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 25%, #000000 50%, #0d0d0d 75%, #2a2a2a 100%);
      background-size: 150% 150%;
      animation: wave1 14.4s ease-in-out infinite;
      transform: scale(1.2);
      filter: blur(1px);
    }
    
    .wave-layer-2 {
      background: radial-gradient(ellipse 1600px 1300px at 60% 30%, rgba(50, 50, 50, 1) 0%, rgba(50, 50, 50, 0.95) 10%, rgba(50, 50, 50, 0.85) 20%, rgba(38, 38, 38, 0.72) 38%, rgba(26, 26, 26, 0.55) 55%, rgba(13, 13, 13, 0.35) 70%, transparent 85%),
                  radial-gradient(ellipse 1500px 1200px at 40% 70%, rgba(40, 40, 40, 1) 0%, rgba(40, 40, 40, 0.95) 10%, rgba(40, 40, 40, 0.85) 20%, rgba(26, 26, 26, 0.72) 38%, rgba(13, 13, 13, 0.55) 55%, rgba(0, 0, 0, 0.35) 70%, transparent 85%),
                  radial-gradient(ellipse 1400px 1100px at 10% 80%, rgba(45, 45, 45, 1) 0%, rgba(45, 45, 45, 0.95) 12%, rgba(45, 45, 45, 0.85) 22%, rgba(38, 38, 38, 0.72) 40%, rgba(26, 26, 26, 0.55) 58%, rgba(13, 13, 13, 0.35) 75%, transparent 90%),
                  radial-gradient(ellipse 1300px 1000px at 90% 20%, rgba(42, 42, 42, 1) 0%, rgba(42, 42, 42, 0.9) 15%, rgba(38, 38, 38, 0.75) 32%, rgba(26, 26, 26, 0.55) 50%, transparent 75%),
                  linear-gradient(45deg, #2a2a2a 0%, #1a1a1a 25%, #0d0d0d 50%, #1a1a1a 75%, #000000 100%);
      background-size: 180% 180%;
      animation: wave2 18s ease-in-out infinite;
      transform: scale(1.25);
      animation-delay: -3.6s;
      filter: blur(1.2px);
    }
    
    .wave-layer-3 {
      background: radial-gradient(ellipse 1700px 1400px at 50% 50%, rgba(35, 35, 35, 1) 0%, rgba(35, 35, 35, 0.95) 12%, rgba(35, 35, 35, 0.88) 25%, rgba(26, 26, 26, 0.75) 45%, rgba(13, 13, 13, 0.55) 62%, rgba(0, 0, 0, 0.35) 78%, transparent 95%),
                  radial-gradient(ellipse 1600px 1300px at 30% 60%, rgba(30, 30, 30, 1) 0%, rgba(30, 30, 30, 0.95) 12%, rgba(30, 30, 30, 0.88) 25%, rgba(26, 26, 26, 0.75) 45%, rgba(13, 13, 13, 0.55) 62%, rgba(0, 0, 0, 0.35) 78%, transparent 95%),
                  radial-gradient(ellipse 1500px 1200px at 80% 40%, rgba(33, 33, 33, 1) 0%, rgba(33, 33, 33, 0.92) 18%, rgba(26, 26, 26, 0.78) 38%, rgba(13, 13, 13, 0.58) 58%, transparent 80%),
                  linear-gradient(-45deg, #0a0a0a 0%, #0d0d0d 20%, #1a1a1a 40%, #0d0d0d 60%, #2a2a2a 80%, #000000 100%);
      background-size: 200% 200%;
      animation: wave3 21.6s ease-in-out infinite;
      transform: scale(1.3);
      animation-delay: -7.2s;
      filter: blur(1.5px);
    }
    
    @keyframes wave1 {
      0%, 100% {
        background-position: 0% 50%, 100% 50%, 50% 0%, 0% 0%;
        transform: scale(1.2) translateY(0px) translateX(0px) rotate(0deg);
      }
      25% {
        background-position: 100% 20%, 0% 80%, 80% 40%, 50% 50%;
        transform: scale(1.3) translateY(-60px) translateX(30px) rotate(5deg);
      }
      50% {
        background-position: 50% 100%, 50% 0%, 20% 80%, 100% 100%;
        transform: scale(1.15) translateY(40px) translateX(-20px) rotate(-4deg);
      }
      75% {
        background-position: 80% 30%, 20% 70%, 60% 20%, 30% 50%;
        transform: scale(1.28) translateY(-30px) translateX(40px) rotate(3deg);
      }
    }
    
    @keyframes wave2 {
      0%, 100% {
        background-position: 50% 50%, 50% 50%, 50% 50%, 0% 0%;
        transform: scale(1.25) translateY(0px) translateX(0px) rotate(0deg);
      }
      25% {
        background-position: 0% 80%, 100% 20%, 20% 60%, 100% 50%;
        transform: scale(1.35) translateY(70px) translateX(-40px) rotate(-6deg);
      }
      50% {
        background-position: 100% 10%, 0% 90%, 80% 30%, 50% 100%;
        transform: scale(1.2) translateY(-50px) translateX(50px) rotate(4deg);
      }
      75% {
        background-position: 30% 70%, 70% 30%, 40% 80%, 20% 30%;
        transform: scale(1.32) translateY(30px) translateX(-30px) rotate(-3deg);
      }
    }
    
    @keyframes wave3 {
      0%, 100% {
        background-position: 50% 50%, 50% 50%, 0% 0%;
        transform: scale(1.3) translateY(0px) translateX(0px) rotate(0deg);
      }
      33% {
        background-position: 100% 100%, 20% 20%, 100% 100%;
        transform: scale(1.4) translateY(-80px) translateX(60px) rotate(8deg);
      }
      66% {
        background-position: 0% 0%, 80% 80%, 50% 50%;
        transform: scale(1.25) translateY(60px) translateX(-50px) rotate(-6deg);
      }
    }
    
    .prism-effect {
      position: absolute;
      width: 100%;
      height: 100%;
      pointer-events: none;
      mix-blend-mode: overlay;
      opacity: 0.4;
    }
    
    .prism-1 {
      background: 
        linear-gradient(105deg, transparent 0%, rgba(71, 71, 71, 0.3) 25%, transparent 50%, rgba(38, 38, 38, 0.25) 75%, transparent 100%),
        radial-gradient(ellipse 800px 600px at 30% 40%, rgba(60, 60, 60, 0.4) 0%, rgba(47, 47, 47, 0.3) 20%, transparent 50%);
      animation: prism-shift-1 16s ease-in-out infinite;
      filter: blur(3px);
    }
    
    .prism-2 {
      background: 
        linear-gradient(75deg, transparent 0%, rgba(50, 50, 50, 0.35) 30%, transparent 60%, rgba(26, 26, 26, 0.3) 90%, transparent 100%),
        radial-gradient(ellipse 900px 700px at 70% 60%, rgba(55, 55, 55, 0.35) 0%, rgba(42, 42, 42, 0.25) 25%, transparent 55%);
      animation: prism-shift-2 20s ease-in-out infinite;
      animation-delay: -4s;
      filter: blur(3.5px);
    }
    
    .prism-3 {
      background: 
        linear-gradient(135deg, transparent 0%, rgba(45, 45, 45, 0.3) 35%, transparent 70%, rgba(30, 30, 30, 0.25) 100%),
        radial-gradient(ellipse 1000px 800px at 50% 50%, rgba(40, 40, 40, 0.3) 0%, rgba(33, 33, 33, 0.2) 30%, transparent 60%);
      animation: prism-shift-3 18s ease-in-out infinite;
      animation-delay: -8s;
      filter: blur(4px);
    }
    
    .prism-4 {
      background: 
        linear-gradient(45deg, transparent 0%, rgba(35, 35, 35, 0.28) 28%, transparent 56%, rgba(26, 26, 26, 0.22) 84%, transparent 100%),
        radial-gradient(ellipse 1100px 900px at 20% 80%, rgba(38, 38, 38, 0.25) 0%, rgba(30, 30, 30, 0.18) 35%, transparent 65%);
      animation: prism-shift-4 22s ease-in-out infinite;
      animation-delay: -6s;
      filter: blur(3.5px);
    }
    
    @keyframes prism-shift-1 {
      0%, 100% {
        transform: translateX(0) translateY(0) rotate(0deg);
        opacity: 0.4;
      }
      25% {
        transform: translateX(50px) translateY(-30px) rotate(2deg);
        opacity: 0.5;
      }
      50% {
        transform: translateX(-40px) translateY(40px) rotate(-2deg);
        opacity: 0.35;
      }
      75% {
        transform: translateX(30px) translateY(-20px) rotate(1deg);
        opacity: 0.45;
      }
    }
    
    @keyframes prism-shift-2 {
      0%, 100% {
        transform: translateX(0) translateY(0) rotate(0deg);
        opacity: 0.4;
      }
      33% {
        transform: translateX(-60px) translateY(50px) rotate(-3deg);
        opacity: 0.5;
      }
      66% {
        transform: translateX(55px) translateY(-45px) rotate(3deg);
        opacity: 0.35;
      }
    }
    
    @keyframes prism-shift-3 {
      0%, 100% {
        transform: translateX(0) translateY(0) rotate(0deg);
        opacity: 0.4;
      }
      30% {
        transform: translateX(45px) translateY(35px) rotate(2.5deg);
        opacity: 0.48;
      }
      60% {
        transform: translateX(-50px) translateY(-40px) rotate(-2.5deg);
        opacity: 0.32;
      }
    }
    
    @keyframes prism-shift-4 {
      0%, 100% {
        transform: translateX(0) translateY(0) rotate(0deg);
        opacity: 0.4;
      }
      40% {
        transform: translateX(-35px) translateY(45px) rotate(-1.5deg);
        opacity: 0.46;
      }
      80% {
        transform: translateX(40px) translateY(-35px) rotate(1.5deg);
        opacity: 0.34;
      }
    }
    
    /* Login Container */
    .login-container {
      padding: 2rem 1rem;
      min-height: 100vh;
    }
    
    @media (min-width: 768px) {
      .login-container {
        padding: 3rem 2rem;
      }
    }
    
    /* Logo */
    .logo-wrapper {
      padding: 2rem 0;
      animation: logo-entrance 0.8s ease-out;
    }
    
    .logo-image {
      height: 5rem;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4)) 
              drop-shadow(0 4px 12px rgba(255, 255, 255, 0.1));
      transition: transform 0.3s ease;
    }
    
    @media (min-width: 768px) {
      .logo-image {
        height: 6rem;
      }
    }
    
    @media (min-width: 1024px) {
      .logo-image {
        height: 7rem;
      }
    }
    
    .logo-image:hover {
      transform: scale(1.02);
    }
    
    @keyframes logo-entrance {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    /* Login Card */
    .login-card {
      width: 100%;
      max-width: 420px;
      animation: card-entrance 0.6s ease-out 0.2s both;
      border-radius: 16px !important;
      border: 1px solid rgba(150, 150, 150, 0.2) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      background: rgba(20, 20, 20, 0.75) !important;
      overflow: hidden;
    }
    
    .login-card ::ng-deep .p-card {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    
    .login-card ::ng-deep .p-card-body {
      padding: 2rem 1.5rem !important;
    }
    
    @media (min-width: 768px) {
      .login-card ::ng-deep .p-card-body {
        padding: 2.5rem 2rem !important;
      }
    }
    
    @keyframes card-entrance {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    /* Typography */
    .card-title-wrapper {
      text-align: center;
      padding: 0.5rem 0;
    }
    
    .card-subtitle {
      color: rgba(200, 200, 200, 0.7);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    @media (min-width: 768px) {
      .card-subtitle {
        font-size: 0.8125rem;
        margin-bottom: 1rem;
      }
    }
    
    .card-title {
      color: #f5f5f5;
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    @media (min-width: 768px) {
      .card-title {
        font-size: 2rem;
      }
    }
    
    .card-description {
      color: rgba(180, 180, 180, 0.8);
      font-size: 0.875rem;
      margin-top: 0.5rem;
      text-align: center;
      font-weight: 400;
      line-height: 1.5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    @media (min-width: 768px) {
      .card-description {
        font-size: 0.9375rem;
        margin-top: 0.75rem;
      }
    }
    
    /* Card Footer */
    .card-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 1.5rem;
    }
    
    @media (min-width: 640px) {
      .card-footer {
        flex-direction: row;
        justify-content: center;
      }
    }
    
    /* Login Button */
    .login-button {
      width: 100%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      border-radius: 10px !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.25) !important;
    }
    
    @media (min-width: 640px) {
      .login-button {
        width: auto;
        min-width: 200px;
      }
    }
    
    .login-button ::ng-deep .p-button {
      padding: 0.875rem 2rem !important;
      font-size: 1rem !important;
    }
    
    .login-button ::ng-deep .p-button-icon {
      font-size: 1.125rem !important;
      margin-right: 0.5rem !important;
    }
    
    .login-button ::ng-deep .p-button:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4) !important;
      filter: brightness(1.05) !important;
    }
    
    .login-button ::ng-deep .p-button:active {
      transform: translateY(0) !important;
      box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3) !important;
    }
    
    .login-button ::ng-deep .p-button:focus {
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.2), 0 4px 12px rgba(251, 191, 36, 0.25) !important;
    }
    
    /* Responsive adjustments */
    @media (max-width: 640px) {
      .login-container {
        padding: 1.5rem 1rem;
      }
      
      .logo-wrapper {
        padding: 1.5rem 0;
        margin-bottom: 1.5rem;
      }
      
      .logo-image {
        height: 8rem;
      }
      
      .login-card {
        max-width: 100%;
      }
      
      .login-card ::ng-deep .p-card-body {
        padding: 1.5rem 1.25rem !important;
      }
      
      .card-title {
        font-size: 1.5rem;
      }
      
      .card-subtitle {
        font-size: 0.6875rem;
      }
      
      .card-description {
        font-size: 0.8125rem;
      }
    }
    
    /* Smooth transitions for all interactive elements */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  public auth = inject(AuthService);

  signIn() {
    this.auth.loginWithRedirect({});
  }
}
