import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-canvas.component.html',
  styleUrls: ['./game-canvas.component.scss']
})
export class GameCanvasComponent implements AfterViewInit {
  @ViewChild('gameCanvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly canvasWidth = 500;
  private readonly canvasHeight = 300;

  private readonly tankSize = { width: 40, height: 24 };
  private position = { x: 40, y: 40 };

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    this.draw();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const keyMap: { [key: string]: { x: number; y: number } } = {
      ArrowUp: { x: 0, y: -10 },
      w: { x: 0, y: -10 },
      W: { x: 0, y: -10 },
      ArrowDown: { x: 0, y: 10 },
      s: { x: 0, y: 10 },
      S: { x: 0, y: 10 },
      ArrowLeft: { x: -10, y: 0 },
      a: { x: -10, y: 0 },
      A: { x: -10, y: 0 },
      ArrowRight: { x: 10, y: 0 },
      d: { x: 10, y: 0 },
      D: { x: 10, y: 0 }
    };

    const delta = keyMap[event.key];
    if (!delta) return;

    event.preventDefault();
    this.updatePosition(delta.x, delta.y);
    this.draw();
  }

  private updatePosition(deltaX: number, deltaY: number): void {
    this.position = {
      x: Math.min(
        this.canvasWidth - this.tankSize.width,
        Math.max(0, this.position.x + deltaX)
      ),
      y: Math.min(
        this.canvasHeight - this.tankSize.height,
        Math.max(0, this.position.y + deltaY)
      )
    };
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    context.fillStyle = '#2d6a4f';
    context.fillRect(this.position.x, this.position.y, this.tankSize.width, this.tankSize.height);
  }
}
