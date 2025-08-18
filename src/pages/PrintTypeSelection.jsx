import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Image, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';

const PrintTypeSelection = () => {
  const { setPrintType } = useStore();
  const [selectedType, setSelectedType] = useState(null);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setPrintType(type);
  };

  const printTypes = [
    {
      id: 'documents',
      title: 'Dokumen',
      description: 'PDF saja',
      icon: FileText,
      color: 'border-primary hover:border-primary hover:bg-primary/5',
      iconColor: 'text-primary',
      uploadRoute: '/upload/dokumen',
      features: [
        'Format: PDF',
        'Ukuran: A4',
        'Cetak Berwarna',
        'Kualitas Tinggi'
      ]
    },
    {
      id: 'photos',
      title: 'Foto',
      description: 'JPG, PNG dalam berbagai ukuran',
      icon: Image,
      color: 'border-secondary hover:border-secondary hover:bg-secondary/5',
      iconColor: 'text-secondary',
      uploadRoute: '/upload/foto',
      features: [
        'Format: JPG, PNG',
        'Ukuran: 2R, 3R, 4R, 5R, 6R',
        'Kualitas Photo Premium',
      ]
    }
  ];

  const selectedTypeData = printTypes.find(type => type.id === selectedType);

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-base-content mb-4">
              Pilih Jenis Cetak
            </h1>
            <p className="text-base-content/70 max-w-2xl mx-auto">
              Pilih jenis file yang ingin Anda cetak. Kami mendukung berbagai format untuk kebutuhan Anda.
            </p>
          </div>

          {/* Print Type Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {printTypes.map((type) => (
              <div
                key={type.id}
                className={`card bg-base-100 shadow-xl border-2 cursor-pointer transition-all duration-300 ${
                  selectedType === type.id 
                    ? `${type.color} ring-2 ring-offset-2 ring-primary` 
                    : `border-base-300 ${type.color}`
                }`}
                onClick={() => handleTypeSelect(type.id)}
              >
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-full bg-base-200`}>
                        <type.icon className={`w-8 h-8 ${type.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="card-title text-xl">{type.title}</h3>
                        <p className="text-base-content/70 text-sm">{type.description}</p>
                      </div>
                    </div>
                    {selectedType === type.id && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="font-semibold mb-2">Fitur:</h4>
                    <ul className="space-y-1">
                      {type.features.map((feature, index) => (
                        <li key={index} className="text-sm text-base-content/70 flex items-center">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          {selectedType && selectedTypeData && (
            <div className="text-center">
              <Link 
                to={selectedTypeData.uploadRoute}
                className="btn-printku btn-lg"
              >
                Lanjutkan ke Upload
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          )}

          {/* Help Text */}
          <div className="text-center mt-8">
            <p className="text-base-content/60 text-sm">
              Tidak yakin dengan pilihan Anda? Anda dapat mengubahnya nanti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintTypeSelection;