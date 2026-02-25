/**
 * Steganography utilities for Advanced LSB and Image Scaling
 */

export interface SteganoResult {
  dataUrl: string;
  capacity: number;
  messageLength: number;
}

/**
 * Encodes a message into an image using LSB.
 * @param canvas The canvas containing the image.
 * @param message The message to hide.
 * @param bitsPerChannel Number of bits per color channel to use (1-4).
 */
export const encodeLSB = (
  canvas: HTMLCanvasElement,
  message: string,
  bitsPerChannel: number = 1
): SteganoResult => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert message to bit array
  // We'll add a 32-bit length header first
  const binaryMessage = stringToBin(message);
  const lengthHeader = (message.length).toString(2).padStart(32, '0');
  const fullBinary = lengthHeader + binaryMessage;

  let bitIndex = 0;
  const mask = 255 << bitsPerChannel;

  for (let i = 0; i < data.length && bitIndex < fullBinary.length; i++) {
    // Skip alpha channel for simplicity or use it too? Let's use RGB.
    if ((i + 1) % 4 === 0) continue; 

    const bitsToHide = fullBinary.substring(bitIndex, bitIndex + bitsPerChannel);
    const valueToHide = parseInt(bitsToHide.padEnd(bitsPerChannel, '0'), 2);
    
    data[i] = (data[i] & mask) | valueToHide;
    bitIndex += bitsPerChannel;
  }

  ctx.putImageData(imageData, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    capacity: Math.floor((data.length * 3 / 4) * bitsPerChannel / 8),
    messageLength: message.length
  };
};

/**
 * Decodes a message from an image using LSB.
 */
export const decodeLSB = (
  canvas: HTMLCanvasElement,
  bitsPerChannel: number = 1
): string => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let binaryString = '';
  const bitMask = (1 << bitsPerChannel) - 1;

  // We need at least 32 bits for the length header
  // Total bits available = (pixels * 3 channels) * bitsPerChannel
  const totalAvailableBits = (data.length / 4) * 3 * bitsPerChannel;
  
  if (totalAvailableBits < 32) {
    throw new Error('Image is too small to contain a message.');
  }

  // Extract bits until we have at least 32 bits for the header
  let i = 0;
  while (binaryString.length < 32 && i < data.length) {
    if ((i + 1) % 4 !== 0) {
      const bits = (data[i] & bitMask).toString(2).padStart(bitsPerChannel, '0');
      binaryString += bits;
    }
    i++;
  }

  const lengthBits = binaryString.substring(0, 32);
  const messageLength = parseInt(lengthBits, 2);
  
  // Basic sanity check for message length
  // Max possible bytes = (totalAvailableBits - 32) / 8
  const maxPossibleBytes = Math.floor((totalAvailableBits - 32) / 8);

  if (isNaN(messageLength) || messageLength <= 0 || messageLength > maxPossibleBytes) {
    throw new Error('No valid message found. Make sure you are using the correct Bit-Depth and the image was not compressed.');
  }

  // Continue extracting bits until we have the full message
  const requiredBits = 32 + (messageLength * 8);
  while (binaryString.length < requiredBits && i < data.length) {
    if ((i + 1) % 4 !== 0) {
      const bits = (data[i] & bitMask).toString(2).padStart(bitsPerChannel, '0');
      binaryString += bits;
    }
    i++;
  }

  if (binaryString.length < requiredBits) {
    throw new Error('Image data ended prematurely. Message might be corrupted.');
  }

  const messageBits = binaryString.substring(32, requiredBits);
  return binToString(messageBits);
};

const stringToBin = (str: string): string => {
  return str.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
};

const binToString = (bin: string): string => {
  const bytes = bin.match(/.{1,8}/g) || [];
  return bytes.map(byte => String.fromCharCode(parseInt(byte, 2))).join('');
};

/**
 * Scales an image to a new size.
 */
export const scaleImage = (
  img: HTMLImageElement,
  scale: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Use high quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas;
};
