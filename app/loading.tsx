import { LoadingScreen } from '@/components/ui/loader'

/* Fronteira mais externa do app. Cobre o trabalho assíncrono dos layouts de
   grupo — que é onde mora a verificação de sessão (`requireRole`). Enquanto
   ela não resolve, não existe sidebar nem navbar pra preencher, então a tela
   cheia é a única resposta honesta. */
export default function Loading() {
  return <LoadingScreen label="Preparando tudo" hint="Conferindo seu acesso…" />
}
