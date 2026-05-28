import { Link } from 'react-router-dom';
import notFoundIllustration from '../../Imagens/Vetores/404.svg';

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl bg-brand-card p-8 text-center shadow-lg md:p-12">
        <div className="flex justify-center mb-6">
          <img
            src={notFoundIllustration}
            alt="Ilustração 404"
            className="w-48 h-auto md:w-56 select-none"
          />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-brand-text-primary md:text-2xl">
          Link não encontrado
        </h1>

        <p className="mt-4 text-sm text-brand-text-secondary leading-relaxed">
          O link que você está tentando acessar não existe, foi removido ou é uma URL inválida. 
          Saiba mais em{' '}
          <Link to="/" className="text-brand-blue hover:underline font-medium">
            brev.ly
          </Link>
          .
        </p>

      </div>
    </div>
  );
}
