import { createCanvas, loadImage } from '@napi-rs/canvas';

// Helper to wrap text into lines
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// Function to generate the quote card image
export async function createQuoteImage(avatarUrl, username, userId, timestamp, quoteText) {
  // 1. Fetch and load avatar image with a fallback
  let avatarImg;
  try {
    const defaultAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';
    const fetchUrl = avatarUrl || defaultAvatar;
    avatarImg = await loadImage(fetchUrl);
  } catch (err) {
    console.error('Failed to load user avatar, using fallback default:', err);
    avatarImg = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
  }

  // 2. Extract dominant/average color from avatar
  const sampleCanvas = createCanvas(10, 10);
  const sampleCtx = sampleCanvas.getContext('2d');
  sampleCtx.drawImage(avatarImg, 0, 0, 10, 10);
  const pixelData = sampleCtx.getImageData(0, 0, 10, 10).data;
  
  let r = 0, g = 0, b = 0, pixelCount = 0;
  for (let i = 0; i < pixelData.length; i += 4) {
    // Skip highly transparent pixels if any
    if (pixelData[i + 3] < 128) continue;
    r += pixelData[i];
    g += pixelData[i + 1];
    b += pixelData[i + 2];
    pixelCount++;
  }
  
  if (pixelCount > 0) {
    r = Math.floor(r / pixelCount);
    g = Math.floor(g / pixelCount);
    b = Math.floor(b / pixelCount);
  } else {
    // Default pinkish theme color
    r = 255; g = 158; b = 207;
  }

  // 3. Setup canvas dimension dynamically based on text wrapping
  const width = 1000;
  const paddingX = 60;
  const maxWidth = width - paddingX * 2;
  
  // Create a temporary canvas to measure text wrapping
  const tempCanvas = createCanvas(1, 1);
  const tempCtx = tempCanvas.getContext('2d');
  
  let fontSize = 28;
  tempCtx.font = `italic ${fontSize}px sans-serif`;
  let wrappedLines = wrapText(tempCtx, quoteText, maxWidth);

  // Auto-scale font size down if it wraps into too many lines
  if (wrappedLines.length > 5) {
    fontSize = 22;
    tempCtx.font = `italic ${fontSize}px sans-serif`;
    wrappedLines = wrapText(tempCtx, quoteText, maxWidth);
  }
  if (wrappedLines.length > 8) {
    fontSize = 18;
    tempCtx.font = `italic ${fontSize}px sans-serif`;
    wrappedLines = wrapText(tempCtx, quoteText, maxWidth).slice(0, 10); // cap at 10 lines max
  }

  const headerHeight = 170;
  const lineSpacing = fontSize * 1.35;
  const contentHeight = wrappedLines.length * lineSpacing;
  const footerHeight = 40;
  const height = Math.max(300, headerHeight + contentHeight + footerHeight);

  // Create main canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 4. Draw Background Layer (Linear Gradient & Dark overlay)
  ctx.fillStyle = '#0f1012';
  ctx.fillRect(0, 0, width, height);

  // Radial glow in upper-right corner using avatar extracted color
  const radialGlow = ctx.createRadialGradient(width - 150, 150, 10, width - 150, 150, 500);
  radialGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.22)`);
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  // 5. Draw Glassmorphism Card Overlay
  const cardMargin = 20;
  const cardWidth = width - cardMargin * 2;
  const cardHeight = height - cardMargin * 2;
  
  ctx.fillStyle = 'rgba(24, 25, 28, 0.65)';
  ctx.beginPath();
  ctx.roundRect(cardMargin, cardMargin, cardWidth, cardHeight, 16);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cardMargin, cardMargin, cardWidth, cardHeight, 16);
  ctx.stroke();

  // 6. Draw Translucent Decorative Quotation Marks (Background Accent)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.font = '240px Georgia, serif';
  ctx.fillText('“', 40, 240);
  ctx.fillText('”', width - 180, height - 60);

  // 7. Draw Avatar & Rounding Mask
  const avatarX = 50;
  const avatarY = 50;
  const avatarSize = 75;
  
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  // Draw white border ring on avatar
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // 8. Draw Author Details (Name, ID, Timestamp)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(username, avatarX + avatarSize + 20, avatarY + 32);

  ctx.fillStyle = '#949ba4';
  ctx.font = '16px sans-serif';
  const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  ctx.fillText(`ID: ${userId}  •  ${formattedDate}`, avatarX + avatarSize + 20, avatarY + 58);

  // 9. Draw Wrapped Quote Text
  ctx.fillStyle = '#e3e5e8';
  ctx.font = `italic ${fontSize}px sans-serif`;
  ctx.textBaseline = 'top';

  let currentY = headerHeight - 20;
  for (const line of wrappedLines) {
    ctx.fillText(line, paddingX, currentY);
    currentY += lineSpacing;
  }

  // 10. Return Image Buffer
  return canvas.toBuffer('image/png');
}
export default createQuoteImage;
