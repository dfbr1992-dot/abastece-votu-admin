import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstallationsCount } from '../hooks/usePWAInstallationsCount';

export function PWAInstallationsCard() {
  const { data: installationsCount, isLoading, isError } = usePWAInstallationsCount();

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 xl:p-8">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Download className="h-6 w-6 text-gray-400" aria-hidden="true" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Instalações do App (PWA)</dt>
          <dd className="flex items-baseline">
            {isLoading && <p className="text-2xl font-semibold text-gray-900 dark:text-white italic text-sm">Carregando...</p>}
            {isError && <p className="text-2xl font-semibold text-red-600 dark:text-red-400">Erro</p>}
            {!isLoading && !isError && (
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{installationsCount || 0}</p>
            )}
          </dd>
        </div>
      </div>
    </div>
  );
}
