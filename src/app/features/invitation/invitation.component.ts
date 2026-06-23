import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-invitation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#e8efe9] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <!-- Decorative Greenery Background Blurs -->
      <div class="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#d0dfd3] filter blur-3xl opacity-50"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#c0d5c4] filter blur-3xl opacity-50"></div>

      <!-- Outer Card Container -->
      <div class="relative w-full max-w-[500px] bg-white rounded-3xl shadow-[0_25px_60px_rgba(26,54,35,0.15)] overflow-hidden border border-[#c3d3c6]/40 p-3 md:p-4 z-10 animate-fade-in">
        
        <!-- Invitation Card Image Container -->
        <div class="relative w-full aspect-[3/4.2] rounded-2xl overflow-hidden shadow-inner invite-card-container">
          <img 
            src="/invitation-card.jpg" 
            alt="Engagement Invitation of Sashika and Janith" 
            class="w-full h-full object-cover block"
          />
          
          <!-- Transparent Protection Overlay (Blocks long-press menus and drag-and-drop on mobile/desktop) -->
          <div class="absolute inset-0 z-20 pointer-events-auto bg-transparent"></div>
          
          <!-- Dynamic Guest Name Overlay (Positioned exactly on the dotted line) -->
          <div class="guest-name-overlay z-30">
            {{ guestName() }}
          </div>
        </div>
      </div>

      <!-- Premium Quick Action Buttons (RSVP & Google Maps Location) -->
      <div class="w-full max-w-[500px] mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 z-10 animate-fade-in-delayed">
        <!-- Google Maps Button -->
        <a 
          href="https://maps.google.com/?q=Arangala+Forest+Lodge+Hotel+Naula" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="flex-1 bg-white hover:bg-[#fafbfb] text-[#2c4e35] border border-[#2c4e35]/20 font-medium py-3.5 px-6 rounded-2xl transition duration-300 ease-out shadow-sm flex items-center justify-center gap-2 text-center"
        >
          📍 View on Google Maps
        </a>
        
        <!-- Call RSVP Button -->
        <a 
          href="tel:+94756534407" 
          class="flex-1 bg-[#2c4e35] hover:bg-[#203a27] text-white font-medium py-3.5 px-6 rounded-2xl transition duration-300 ease-out shadow-md flex items-center justify-center gap-2 text-center"
        >
          📞 RSVP: Call Janith
        </a>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-fade-in-delayed {
      opacity: 0;
      animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
    }

    /* Container holding the image and overlay to enable Container Queries */
    .invite-card-container {
      container-type: inline-size;
    }

    /* Guest Name Overlay Positioned exactly on the dotted line in the invitation image */
    .guest-name-overlay {
position: absolute;
    top: 49.8%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 76%;
    text-align: center;
    font-family: "Dancing Script", cursive;
    font-size: 6.5cqw;
    color: #0f3ba2;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0px 1px 1px rgba(255, 255, 255, 0.6);
    pointer-events: none;
    letter-spacing: 0.01em;
    }
  `]
})
export class InvitationComponent {
  private route = inject(ActivatedRoute);

  // Read the 'name' query parameter using ActivatedRoute and Angular Signals
  public readonly guestName = toSignal(
    this.route.queryParamMap.pipe(
      map(params => params.get('name')?.trim() || 'Our Valued Guest')
    ),
    { initialValue: 'Our Valued Guest' }
  );
}
