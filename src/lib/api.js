import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8181/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for file uploads
});

// Pricing API
export const getPricing = async (type) => {
  try {
    const response = await api.get(`/pricing/${type}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch pricing');
  }
};

// Pricing API object for usePricing hook
export const pricingApi = {
  getDocs: () => api.get('/pricing/docs'),
  getPhoto: () => api.get('/pricing/photo')
};

// File validation
export const validateFile = (file, printType) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!file) throw new Error('Pilih file terlebih dahulu');
  if (file.size > maxSize) throw new Error('File terlalu besar (max 10MB)');
  
  if (printType === 'DOCS') {
    if (file.type !== 'application/pdf') {
      throw new Error('Dokumen harus berformat PDF');
    }
  } else if (printType === 'PHOTO') {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Foto harus berformat JPG atau PNG');
    }
  }
};

// Form validation
export const validateFormData = (data) => {
  const errors = [];
  
  if (!data.file) errors.push('File harus dipilih');
  if (!data.customer_phone) errors.push('Nomor telepon wajib diisi');
  if (!data.print_type) errors.push('Jenis cetak harus dipilih');
  if (!data.total_price || data.total_price <= 0) errors.push('Harga tidak valid');
  
  if (data.print_type === 'DOCS') {
    if (!data.docs_color_type) errors.push('Pilih jenis warna');
    if (!data.page_count || data.page_count <= 0) errors.push('Jumlah halaman tidak valid');
  }
  
  if (data.print_type === 'PHOTO') {
    if (!data.photo_size) errors.push('Pilih ukuran foto');
    if (!data.photo_quantity || data.photo_quantity <= 0) errors.push('Jumlah foto tidak valid');
  }
  
  return errors;
};

// Main API function - Create job and invoice
export const createJobAndInvoice = async (formData, onUploadProgress) => {
  try {
    const response = await api.post('/payments/create-job-invoice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onUploadProgress) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onUploadProgress(progress);
        }
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Upload failed');
  }
};

// Get print job by print code
export const getPrintJobByCode = async (printCode) => {
  try {
    const response = await api.get(`/jobs/code/${printCode}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch print job');
  }
};

// PDF Validation API - NEW
export const validatePDF = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/jobs/validate-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000 // 60 seconds for PDF analysis
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to validate PDF');
  }
};

export default api;