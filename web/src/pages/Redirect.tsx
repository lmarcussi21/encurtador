import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import logoIconSvg from '../../Imagens/Vetores/Logo_Icon.svg';
import { Button } from '../components/Button';

export function Redirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const didRedirect = useRef(false);

  useEffect(() => {
    if (didRedirect.current) {
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3333';

    if (!code) {
      setError(true);
      return;
    }

    didRedirect.current = true;

    fetch(`${backendUrl}/links/${code}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Link not found');
        }
        return res.json();
      })
      .then((data) => {
        let url = data.originalUrl;

        if (!/^https?:\/\//i.test(url)) {
          url = `http://${url}`;
        }

        window.location.replace(url);
      })
      .catch(() => {
        setError(true);
      });
  }, [code]);

  if (error) {
    navigate('/NotFound', { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-brand-card p-8 text-center shadow-lg md:p-12">
        <div className="flex justify-center mb-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue animate-pulse">
            <img src={logoIconSvg} alt="Logo brev.ly ícone" className="h-10 w-10" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-brand-text-primary md:text-2xl">
          Redirecionando...
        </h1>

        <p className="mt-4 text-sm text-brand-text-secondary leading-relaxed">
          O link será aberto automaticamente em alguns instantes.
        </p>

        <p className="mt-2 text-sm text-brand-text-secondary">
          Não foi redirecionado?{' '}
          <Button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            variant="secondary"
            size="sm"
            className="ml-2"
          >
            Acesse aqui
          </Button>
        </p>
      </div>
    </div>
  );
}
