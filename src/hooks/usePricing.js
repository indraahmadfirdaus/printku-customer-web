import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { pricingApi } from '../lib/api';

export const usePricing = () => {
  const {
    docsPricing,
    photoPricing,
    pricingLoading,
    pricingError,
    setPricingData,
    setPricingLoading,
    setPricingError,
    clearPricingError
  } = useStore();

  const fetchPricing = async () => {
    if (docsPricing && photoPricing) return; // Already loaded

    setPricingLoading(true);
    clearPricingError();

    try {
      const [docsResponse, photoResponse] = await Promise.all([
        pricingApi.getDocs(),
        pricingApi.getPhoto()
      ]);

      if (docsResponse.data.success) {
        setPricingData('docs', docsResponse.data.data);
      }

      if (photoResponse.data.success) {
        setPricingData('photo', photoResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
      setPricingError('Gagal memuat informasi harga. Silakan coba lagi.');
    } finally {
      setPricingLoading(false);
    }
  };

  const refetchPricing = async () => {
    // Force refetch
    setPricingData('docs', null);
    setPricingData('photo', null);
    await fetchPricing();
  };

  // Helper functions untuk format pricing
  const getDocsPricingDisplay = () => {
    if (!docsPricing?.pricing) return null;
    
    const blackWhite = docsPricing.pricing.find(p => p.color_type === 'BLACK_WHITE');
    const color = docsPricing.pricing.find(p => p.color_type === 'COLOR');
    
    return {
      blackWhite: blackWhite?.price_per_page || 0,
      color: color?.price_per_page || 0,
      startingPrice: blackWhite?.price_per_page || 0
    };
  };

  const getPhotoPricingDisplay = () => {
    if (!photoPricing?.pricing) return null;
    
    const sortedPricing = [...photoPricing.pricing].sort((a, b) => 
      a.price_per_copy - b.price_per_copy
    );
    
    return {
      sizes: photoPricing.pricing.map(p => ({
        size: p.photo_size.replace('SIZE_', ''),
        price: p.price_per_copy
      })),
      startingPrice: sortedPricing[0]?.price_per_copy || 0
    };
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  return {
    docsPricing,
    photoPricing,
    pricingLoading,
    pricingError,
    fetchPricing,
    refetchPricing,
    getDocsPricingDisplay,
    getPhotoPricingDisplay
  };
};