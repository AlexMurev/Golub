import React, { useEffect, useState } from 'react';
import './LinkPreview.css';

interface PreviewData {
  title?: string;
  description?: string;
  images?: string[];
  favicons?: string[];
  siteName?: string;
  url: string;
}

interface LinkPreviewProps {
  url: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [imageFailed, setImageFailed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const result = await window.api.link.getPreview(url);
        if (cancelled) return;

        if (result.success && result.data) {
          setData(result.data as PreviewData);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, [url]);

  if (error || !data) return null;

  const image: string | undefined = imageFailed
    ? undefined
    : data.images?.[0] || data.favicons?.[0];

  return (
    <a className="link-preview" href={url} target="_blank" rel="noopener noreferrer">
      {image && (
        <div className="link-preview__image-wrapper">
          <img
            src={image}
            alt={data.title || ''}
            className="link-preview__image"
            onError={(): void => setImageFailed(true)}
            loading="lazy"
          />
        </div>
      )}

      <div className="link-preview__content">
        {data.siteName && <span className="link-preview__site">{data.siteName}</span>}
        {data.title && <span className="link-preview__title">{data.title}</span>}
        {data.description && <span className="link-preview__desc">{data.description}</span>}
        <span className="link-preview__url">{url}</span>
      </div>
    </a>
  );
};
