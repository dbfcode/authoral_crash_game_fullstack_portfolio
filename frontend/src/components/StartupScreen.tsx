type Props = {
  subtitle?: string;
};

export function StartupScreen({ subtitle }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0f] p-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-casino-accent/30 border-t-casino-accent" />
      <div>
        <h1 className="text-2xl font-bold text-white">Iniciando aplicação…</h1>
        <p className="mt-2 max-w-md text-sm text-gray-400">
          {subtitle ??
            'Aguarde enquanto Keycloak, APIs e WebSocket sobem. Na primeira execução isso pode levar 1–2 minutos.'}
        </p>
      </div>
    </div>
  );
}
