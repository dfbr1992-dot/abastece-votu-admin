import { Button } from '@/components/ui/button';
import { usePostoServicos, useSavePostoServicos, type PostoServicos } from '@/hooks/usePostoServicos';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const SERVICOS = [
  { key: 'conveniencia', label: 'Conveniência' },
  { key: 'gas_cozinha', label: 'Gás de cozinha' },
  { key: 'troca_oleo', label: 'Troca de óleo' },
  { key: 'carregador_ev', label: 'Carregador EV' },
  { key: 'aceita_ticket', label: 'Aceita ticket' },
] as const;

export function PostoServicosForm({ postoId }: { postoId: string }) {
  const { data, isLoading } = usePostoServicos(postoId);
  const { mutate: salvar, isPending } = useSavePostoServicos();
  const [form, setForm] = useState<PostoServicos | null>(null);

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-4">Carregando serviços...</p>;
  }

  if (!form) return null;

  const handleToggle = (key: string) => {
    setForm(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: !prev[key as keyof Omit<PostoServicos, 'posto_id' | 'updated_at'>],
      };
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Serviços do Posto</h3>
      </div>
      
      <div className="space-y-3">
        {SERVICOS.map(({ key, label }) => {
          const isChecked = !!form[key as keyof Omit<PostoServicos, 'posto_id' | 'updated_at'>];
          return (
            <div 
              key={key} 
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => handleToggle(key)}
            >
              <input
                type="checkbox"
                id={`svc-${key}`}
                checked={isChecked}
                onChange={() => handleToggle(key)}
                className="w-5 h-5 cursor-pointer accent-emerald-500"
              />
              <label 
                htmlFor={`svc-${key}`} 
                className="text-sm text-gray-300 cursor-pointer flex-1"
              >
                {label}
              </label>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${isChecked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                {isChecked ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (form) {
            salvar(form, {
              onSuccess: () => toast.success('Serviços atualizados com sucesso'),
              onError: (err: any) => toast.error('Erro ao salvar: ' + (err?.message || 'Erro desconhecido')),
            });
          }
        }}
        disabled={isPending}
        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2"
      >
        {isPending ? 'Salvando...' : '✓ Atualizar Serviços'}
      </Button>
    </div>
  );
}
