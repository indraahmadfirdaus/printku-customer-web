import * as pdfjsLib from 'pdfjs-dist';

// Set worker path untuk versi 3.11.174
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/**
 * Count pages in a PDF file using PDF.js
 * @param {File} file - The PDF file object
 * @returns {Promise<number>} - Number of pages
 */
const countPdfPages = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Error counting PDF pages:', error);
    throw error;
  }
};

/**
 * Estimate pages in a DOCX file based on file size
 * This is a rough estimation since we can't easily parse DOCX in browser
 * @param {File} file - The DOCX file object
 * @returns {number} - Estimated number of pages
 */
const estimateDocxPages = (file) => {
  // Rough estimation: 1 page ≈ 50KB for a typical document
  // This is very approximate and can vary greatly
  const estimatedPages = Math.max(1, Math.ceil(file.size / (50 * 1024)));
  console.warn(`DOCX page count is estimated: ${estimatedPages} pages`);
  return estimatedPages;
};

/**
 * Estimate pages in a DOC file based on file size
 * @param {File} file - The DOC file object
 * @returns {number} - Estimated number of pages
 */
const estimateDocPages = (file) => {
  // Rough estimation: 1 page ≈ 25KB for older DOC format
  const estimatedPages = Math.max(1, Math.ceil(file.size / (25 * 1024)));
  console.warn(`DOC page count is estimated: ${estimatedPages} pages`);
  return estimatedPages;
};

/**
 * Analyze pixel data to detect colors
 * @param {Uint8ClampedArray} data - Image data from canvas
 * @returns {boolean} - True if colors detected, false if grayscale
 */
const analyzePixelData = (data) => {
  const colorThreshold = 15; // Toleransi untuk variasi kecil
  let colorPixelCount = 0;
  const totalPixels = data.length / 4;
  const colorPercentageThreshold = 0.1; // 0.1% pixel berwarna = dokumen berwarna
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    
    // Skip pixel transparan
    if (alpha < 128) continue;
    
    // Hitung perbedaan maksimum antar channel RGB
    const maxDiff = Math.max(
      Math.abs(r - g),
      Math.abs(g - b),
      Math.abs(r - b)
    );
    
    // Jika perbedaan melebihi threshold, dianggap berwarna
    if (maxDiff > colorThreshold) {
      colorPixelCount++;
    }
  }
  
  // Hitung persentase pixel berwarna
  const colorPercentage = (colorPixelCount / totalPixels) * 100;
  
  // Return true jika persentase pixel berwarna melebihi threshold
  return colorPercentage > colorPercentageThreshold;
};

/**
 * Count pages in a document file (simple version for current use)
 * @param {File} file - The file object
 * @returns {Promise<number>} - Number of pages
 */
export const countDocumentPages = async (file) => {
  const fileType = file.type;
  
  switch (fileType) {
    case 'application/pdf':
      return await countPdfPages(file);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return estimateDocxPages(file);
    case 'application/msword':
      return estimateDocPages(file);
    default:
      console.warn('Unsupported file type for page counting:', fileType);
      return 1; // Default to 1 page
  }
};

/**
 * Analyze document content for pages and color detection
 * @param {File} file - The file object
 * @returns {Promise<{pageCount: number, hasColor: boolean}>} - Analysis result
 */
export const analyzeDocumentContent = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let hasColor = false;
    let totalPages = pdf.numPages;
    
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      
      // Analisis warna pada halaman ini
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      if (analyzePixelData(imageData.data)) {
        hasColor = true;
        break; // Jika sudah ketemu warna, tidak perlu cek halaman lain
      }
    }
    
    return { pageCount: totalPages, hasColor };
  } catch (error) {
    console.error('Error analyzing document:', error);
    throw error;
  }
};

/**
 * Get supported document MIME types
 */
export const getSupportedDocumentTypes = () => ({
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc']
});


function improvedColorDetection(imageData) {
    const data = imageData.data;
    const pixelCount = data.length / 4;
    let colorPixels = 0;
    const colorThreshold = 25; // Threshold yang lebih tinggi
    const saturationThreshold = 0.1; // Threshold saturasi
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        
        // Skip transparent pixels
        if (alpha < 128) continue;
        
        // Convert to HSL untuk deteksi saturasi
        const hsl = rgbToHsl(r, g, b);
        const saturation = hsl[1];
        
        // Deteksi berdasarkan saturasi dan perbedaan RGB
        const maxDiff = Math.max(
            Math.abs(r - g),
            Math.abs(g - b),
            Math.abs(r - b)
        );
        
        if (saturation > saturationThreshold || maxDiff > colorThreshold) {
            colorPixels++;
        }
    }
    
    const colorPercentage = (colorPixels / pixelCount) * 100;
    return colorPercentage > 0.5; // 0.5% threshold
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return [h, s, l];
}