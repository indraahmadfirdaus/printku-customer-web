import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Print type state
  selectedPrintType: null,
  setPrintType: (type) => set({ selectedPrintType: type }),

  // Pricing state - updated structure
  docsPricing: null,
  photoPricing: null,
  pricingLoading: false,
  pricingError: null,
  
  setPricingData: (type, data) => set({ 
    [`${type}Pricing`]: data,
    pricingError: null
  }),
  
  setPricingLoading: (loading) => set({ pricingLoading: loading }),
  setPricingError: (error) => set({ pricingError: error }),
  clearPricingError: () => set({ pricingError: null }),

  // Upload state
  uploadedFiles: [],
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  addUploadedFile: (file) => set((state) => ({ 
    uploadedFiles: [...state.uploadedFiles, file] 
  })),
  removeUploadedFile: (index) => set((state) => ({
    uploadedFiles: state.uploadedFiles.filter((_, i) => i !== index)
  })),

  // Order state
  currentOrder: null,
  setCurrentOrder: (order) => set({ currentOrder: order }),
  clearOrder: () => set({ 
    currentOrder: null,
    uploadedFiles: [],
    selectedPrintType: null
  }),

  // Loading states
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Error state
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Reset store
  reset: () => set({
    selectedPrintType: null,
    uploadedFiles: [],
    currentOrder: null,
    error: null,
    isLoading: false,
  }),
}));