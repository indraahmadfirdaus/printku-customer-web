import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Calculator, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePricing } from '../hooks/usePricing';
import { useStore } from '../store/useStore';
import { createJobAndInvoice, validateFile, validateFormData, validatePDF } from '../lib/api';
import FileUpload from '../components/FileUpload';
import toast from 'react-hot-toast';

// Update schema untuk mendukung black & white juga
const documentSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(/^[0-9+]+$/, 'Nomor telepon hanya boleh berisi angka dan tanda +'),
  colorType: z.enum(['color', 'bw'], {
    required_error: 'Pilih jenis cetak'
  })
});

// Helper function to truncate file names
const truncateFileName = (fileName, maxLength = 30) => {
  if (!fileName || typeof fileName !== 'string' || fileName.length <= maxLength) {
    return fileName || '';
  }
  
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName.substring(0, maxLength - 3) + '...';
  }
  
  const extension = fileName.substring(lastDotIndex);
  const nameWithoutExt = fileName.substring(0, lastDotIndex);
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
  
  return `${truncatedName}...${extension}`;
};

const DocumentUpload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [pageCountLoading, setPageCountLoading] = useState(false);
  const [pageCountError, setPageCountError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk hasil API validation
  const [pdfValidation, setPdfValidation] = useState(null);
  const [detectedColorType, setDetectedColorType] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisConfidence, setAnalysisConfidence] = useState(null);
  
  const { getDocsPricingDisplay } = usePricing();
  const { setUploadedFiles, setCurrentOrder } = useStore();
  
  const pricingData = getDocsPricingDisplay();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      colorType: 'color'
    }
  });

  const colorType = watch('colorType');

  // Update useEffect untuk menggunakan API validation
  useEffect(() => {
    const analyzeDocument = async () => {
      if (files.length > 0) {
        setPageCountLoading(true);
        setIsAnalyzing(true);
        setPageCountError(null);
        setPdfValidation(null);
        
        try {
          // Panggil API untuk validasi dan analisis PDF
          const validationResult = await validatePDF(files[0].file);
          
          if (validationResult.success) {
            const { data } = validationResult;
            
            // Set hasil dari API dengan field names yang benar
            setPdfValidation(data);
            setTotalPages(data.page_count); // Updated field name
            setAnalysisConfidence(data.confidence);
            
            // Konversi colorType dari API ke format form (handle uppercase)
            const detectedType = data.color_type === 'COLOR' ? 'color' : 'bw';
            setDetectedColorType(detectedType);
            
            // Auto-set form value berdasarkan deteksi
            setValue('colorType', detectedType);
            
            // Show success message dengan confidence
            toast.success(
              `Dokumen dianalisis: ${data.page_count} halaman, ` +
              `${data.analysis.is_color ? 'Berwarna' : 'Hitam Putih'} ` +
              `(${data.analysis.detection_confidence} akurasi)`
            );
            
          } else {
            throw new Error(validationResult.message || 'Validasi PDF gagal');
          }
          
        } catch (error) {
          console.error('Error validating PDF:', error);
          setPageCountError('Gagal menganalisis dokumen. Estimasi: 1 halaman');
          setTotalPages(1);
          setDetectedColorType('color'); // Default ke color jika error
          setValue('colorType', 'color');
          toast.error(error.message || 'Gagal menganalisis dokumen');
        } finally {
          setPageCountLoading(false);
          setIsAnalyzing(false);
        }
      } else {
        setTotalPages(0);
        setPageCountError(null);
      }
    };

    analyzeDocument();
  }, [files, setValue]);

  // Calculate total price when pages or color type changes
  useEffect(() => {
    if (pricingData && totalPages > 0 && colorType) {
      const pricePerPage = colorType === 'bw' 
        ? pricingData.blackWhite 
        : pricingData.color;
      setTotalPrice(totalPages * pricePerPage);
    } else {
      setTotalPrice(0);
    }
  }, [totalPages, colorType, pricingData]);

  const onSubmit = async (data) => {
    if (files.length === 0) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      // Validate file
      validateFile(files[0].file, 'DOCS');

      // Prepare form data for API
      const apiFormData = {
        file: files[0].file,
        customer_phone: data.phoneNumber,
        print_type: 'DOCS',
        total_price: totalPrice,
        docs_color_type: data.colorType === 'bw' ? 'BLACK_WHITE' : 'COLOR',
        page_count: totalPages,
        description: `Print dokumen ${files[0].file.name}`
      };

      // Validate form data
      const validationErrors = validateFormData(apiFormData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Prepare FormData for upload
      const uploadData = new FormData();
      uploadData.append('file', apiFormData.file);
      uploadData.append('customer_phone', apiFormData.customer_phone);
      uploadData.append('print_type', apiFormData.print_type);
      uploadData.append('total_price', apiFormData.total_price.toString());
      uploadData.append('docs_color_type', apiFormData.docs_color_type);
      uploadData.append('page_count', apiFormData.page_count.toString());
      uploadData.append('description', apiFormData.description);

      // Call API
      const result = await createJobAndInvoice(uploadData, setUploadProgress);

      // Store data for later use
      const orderData = {
        type: 'documents',
        files: files,
        colorType: data.colorType,
        phoneNumber: data.phoneNumber,
        totalPages: totalPages,
        totalPrice: totalPrice,
        printJob: result.data.printJob,
        payment: result.data.payment
      };

      setUploadedFiles(files);
      setCurrentOrder(orderData);

      // Store in localStorage as backup
      localStorage.setItem('printJob', JSON.stringify(result.data.printJob));
      localStorage.setItem('paymentData', JSON.stringify(result.data.payment));

      toast.success('Pesanan berhasil dibuat! Mengarahkan ke pembayaran...');

      // Redirect to Xendit payment
      setTimeout(() => {
        window.location.href = result.data.payment.invoice_url;
      }, 1000);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Terjadi kesalahan saat memproses pesanan');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const acceptedFileTypes = {
    'application/pdf': ['.pdf']
  };

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-base-content mb-2">
                Upload Dokumen
              </h1>
              <p className="text-base-content/70">
                Upload dokumen PDF dan pilih jenis cetak yang diinginkan
              </p>
            </div>
            <Link to="/pilih-jenis" className="btn btn-ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ganti Jenis
            </Link>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* File Upload Section */}
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="w-6 h-6 text-secondary" />
                  <h2 className="card-title">Upload Dokumen</h2>
                </div>
                
                {/* Format Information */}
                <div className="bg-info/10 border border-info/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-2">
                    <div className="text-info mt-0.5">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-base-content">
                      <div className="font-semibold mb-2">Informasi Format Dokumen:</div>
                      <ul className="space-y-1 text-xs">
                        <li><strong>📄 Format yang Diterima:</strong> Hanya file PDF</li>
                        <li><strong>✅ Keunggulan PDF:</strong> Hasil cetak paling akurat dan konsisten</li>
                        <li><strong>💡 Tips:</strong> Pastikan dokumen sudah dalam format PDF sebelum upload</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <FileUpload
                  files={files}
                  onFilesChange={setFiles}
                  acceptedFileTypes={acceptedFileTypes}
                  maxFiles={1}
                  fileType="document"
                />

                {/* Page Count Display */}
                {files.length > 0 && (
                  <div className="mt-4 p-4 bg-base-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Jumlah Halaman:</span>
                      <div className="text-right">
                        {pageCountLoading ? (
                          <div className="flex items-center space-x-2">
                            <span className="loading loading-spinner loading-sm"></span>
                            <span>Menghitung...</span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-secondary">
                            {totalPages} halaman
                          </span>
                        )}
                      </div>
                    </div>
                    {pageCountError && (
                      <div className="text-warning text-sm mt-2">
                        ⚠️ {pageCountError}
                      </div>
                    )}
                  </div>
                )}

                {/* PDF Analysis Results - PINDAHKAN KE SINI */}
                {pdfValidation && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4 mt-4">
                    <div className="flex items-start space-x-2">
                      <div className="text-success mt-0.5">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-sm text-base-content">
                        <div className="font-semibold mb-2">📊 Hasil Analisis Dokumen:</div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <strong>📄 Nama File:</strong> {pdfValidation.file_name}
                          </div>
                          <div>
                            <strong>📏 Jumlah Halaman:</strong> {pdfValidation.page_count}
                          </div>
                          <div>
                            <strong>🎨 Jenis Warna:</strong> 
                            <span className={`ml-1 px-2 py-1 rounded text-xs ${
                              pdfValidation.analysis.is_color 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {pdfValidation.analysis.is_color ? 'Berwarna' : 'Hitam Putih'}
                            </span>
                          </div>
                          <div>
                            <strong>🎯 Akurasi Deteksi:</strong> {pdfValidation.analysis.detection_confidence}
                          </div>
                          <div>
                            <strong>📦 Ukuran File:</strong> {(pdfValidation.file_size / 1024 / 1024).toFixed(2)} MB
                          </div>
                          <div>
                            <strong>🔍 Confidence Score:</strong> {(pdfValidation.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Section */}
            {files.length > 0 && (
              <div className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <h2 className="card-title mb-4">Pengaturan Cetak</h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Print Type Selection */}
                    {files.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-base-content">Pilih Jenis Cetak</h3>
                        
                        {/* Color Option */}
                        <label className="flex items-center space-x-3 p-4 border-2 border-base-300 rounded-lg cursor-pointer hover:border-secondary transition-colors">
                          <input
                            type="radio"
                            value="color"
                            {...register('colorType')}
                            className="radio radio-secondary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">🎨 Berwarna</span>
                              <span className="text-lg font-bold text-secondary">
                                Rp {pricingData?.color?.toLocaleString('id-ID')}/halaman
                              </span>
                            </div>
                            {detectedColorType === 'color' && (
                              <div className="text-xs text-success mt-1">✅ Terdeteksi otomatis</div>
                            )}
                          </div>
                        </label>
                        
                        {/* Black & White Option */}
                        <label className="flex items-center space-x-3 p-4 border-2 border-base-300 rounded-lg cursor-pointer hover:border-secondary transition-colors">
                          <input
                            type="radio"
                            value="bw"
                            {...register('colorType')}
                            className="radio radio-secondary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">⚫ Hitam Putih</span>
                              <span className="text-lg font-bold text-secondary">
                                Rp {pricingData?.blackWhite?.toLocaleString('id-ID')}/halaman
                              </span>
                            </div>
                            {detectedColorType === 'bw' && (
                              <div className="text-xs text-success mt-1">✅ Terdeteksi otomatis</div>
                            )}
                          </div>
                        </label>
                        
                        {errors.colorType && (
                          <p className="text-error text-sm mt-1">{errors.colorType.message}</p>
                        )}
                      </div>
                    )}

                    {/* Phone Number Input */}
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold">Nomor Telepon</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/60" />
                        <input
                          type="tel"
                          placeholder="08123456789"
                          className={`input input-bordered w-full pl-10 ${
                            errors.phoneNumber ? 'input-error' : ''
                          }`}
                          {...register('phoneNumber')}
                        />
                      </div>
                      {errors.phoneNumber && (
                        <div className="label">
                          <span className="label-text-alt text-error">{errors.phoneNumber.message}</span>
                        </div>
                      )}
                      <div className="label">
                        <span className="label-text-alt">Nomor ini akan digunakan untuk notifikasi status cetak</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Price Calculator */}
            {files.length > 0 && totalPages > 0 && colorType && (
              <div className="card bg-secondary text-white shadow-xl">
                <div className="card-body">
                  <div className="flex items-center space-x-3 mb-4">
                    <Calculator className="w-6 h-6" />
                    <h2 className="card-title">Ringkasan Harga</h2>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>File:</span>
                      <span className="font-semibold truncate ml-2" title={files[0]?.file?.name}>
                        {files[0] ? truncateFileName(files[0].file.name) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Jumlah Halaman:</span>
                      <span className="font-semibold">{totalPages} halaman</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Jenis Cetak:</span>
                      <span className="font-semibold">
                        {colorType === 'bw' ? 'Hitam Putih' : 'Berwarna'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Harga per Halaman:</span>
                      <span className="font-semibold">
                        Rp {(colorType === 'bw' ? pricingData?.blackWhite : pricingData?.color)?.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="divider"></div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold">Total Harga:</span>
                      <span className="font-bold text-2xl">
                        Rp {totalPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isSubmitting && uploadProgress > 0 && (
              <div className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <h3 className="font-semibold mb-2">Mengunggah file...</h3>
                  <progress className="progress progress-secondary w-full" value={uploadProgress} max="100"></progress>
                  <div className="text-center text-sm text-base-content/70">
                    {uploadProgress}% selesai
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            {files.length > 0 && totalPages > 0 && (
              <div className="text-center">
                <button
                  type="submit"
                  disabled={!isValid || isSubmitting || pageCountLoading}
                  className="btn btn-secondary btn-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Memproses...
                    </>
                  ) : (
                    <>
                      Lanjutkan ke Pembayaran
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;