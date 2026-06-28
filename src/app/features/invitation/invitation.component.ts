import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-invitation',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
            src="/invitation-02.jpg.jpeg" 
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

      <!-- Premium Quick Action Buttons (RSVP, Google Maps Location & Download) -->
      <div class="w-full max-w-[500px] mt-6 flex flex-col gap-3.5 z-10 animate-fade-in-delayed">
        <!-- Download Invitation Card Button -->
        <button 
          (click)="downloadCard()" 
          [disabled]="isDownloading()"
          style="background: #c5a02b; color: white; border: none;"
          class="w-full hover:opacity-90 disabled:opacity-50 font-bold py-4 px-6 rounded-2xl transition duration-300 ease-out shadow-md flex items-center justify-center gap-2 text-center cursor-pointer"
        >
          {{ isDownloading() ? '⌛ Generating Invitation...' : '📥 Download Invitation Card' }}
        </button>

        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
        
        <!-- Back to Generate Page Button -->
        <a 
          routerLink="/admin" 
          class="w-full bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] font-medium py-3.5 px-6 rounded-2xl transition duration-300 ease-out shadow-sm flex items-center justify-center gap-2 text-center mt-1 border border-gray-200"
        >
          ⬅️ Back to Generate Page
        </a>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap');

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
    top: 48%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 76%;
    text-align: center;
    font-family: "Cormorant Garamond", serif;
    font-size: 5cqw;
    color: #0f3ba2;
    font-weight: 500;
    font-style: italic;
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

  protected isDownloading = signal(false);

  async downloadCard() {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);

    try {
      const guestName = this.guestName();
      const imgUrl = '/invitation-02.jpg.jpeg';

      // Load image programmatically
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable CORS if hosted elsewhere in the future
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = imgUrl;
      });

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get 2D context from canvas');
      }

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Setup typography
      // Font size proportional to image width (5.2% of canvas width matches 6.5cqw on screen height scaling)
      const fontSize = canvas.width * 0.052; 
      
      // Ensure the font is loaded in the document
      await document.fonts.ready;

      ctx.font = `500 ${fontSize}px "Dancing Script", cursive`;
      ctx.fillStyle = '#0f3ba2'; // Guest name color
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // The Y coordinate dotted line is exactly at 48% height
      // The X coordinate is centered (50% width)
      const textX = canvas.width / 2;
      const textY = canvas.height * 0.48;

      // Draw guest name
      ctx.fillText(guestName, textX, textY);

      // Trigger download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Invitation_${guestName.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error generating invitation card download:', error);
      alert('Failed to generate invitation card. Please try again.');
    } finally {
      this.isDownloading.set(false);
    }
  }
}
