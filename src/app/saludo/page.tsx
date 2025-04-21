'use client';

export default function SaludoFinal() {


  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-8 text-center">
        <div className="mb-6">
          <svg
            className="w-20 h-20 mx-auto text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-purple-800 mb-4">¡Gracias por tu asistencia!</h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Tu registro ha sido completado exitosamente.
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          Ahora puedes cerrar esta ventana
        </p>
        
        
      </div>
    </div>
  );
}