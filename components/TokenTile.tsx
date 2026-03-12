import React, { useState, useEffect } from 'react';
import { Token, Mood } from '../types';

interface TokenTileProps {
  token: Token;
  width: number;
  height: number;
  mood: Mood;
  onClick: (token: Token) => void;
  dimmed: boolean;
  onHover: (hovering: boolean) => void;
}

/**
 * Why: fixed precision improves readability while avoiding noisy decimal output.
 */
const formatPrice = (price: number): string => {
  if (price < 0.0001) return price.toFixed(4);
  if (price < 1) return price.toFixed(4);
  if (price < 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

/**
 * Why: keeps percent values compact and predictable across all tile sizes.
 */
const formatChange = (change: number): string => Math.abs(change).toFixed(2);

/**
 * Why: prevent label overflow into neighboring tiles by bounding typography with tile dimensions.
 */
const getResponsiveTextSizes = (width: number, height: number): { symbol: number; price: number; change: number; icon: number } => {
  const minSide = Math.max(Math.min(width, height), 1);
  const symbol = Math.max(10, Math.min(56, Math.round(minSide * 0.23)));
  const price = Math.max(9, Math.min(50, Math.round(minSide * 0.19)));
  const change = Math.max(9, Math.min(44, Math.round(minSide * 0.16)));
  const icon = Math.max(14, Math.min(42, Math.round(minSide * 0.2)));
  return { symbol, price, change, icon };
};

const TokenTile: React.FC<TokenTileProps> = ({ token, width, height, mood, onClick, dimmed, onHover }) => {
  const [currentImgSrc, setCurrentImgSrc] = useState<string | undefined>(token.imageUrl);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setCurrentImgSrc(token.imageUrl);
    setImageError(false);
  }, [token.imageUrl]);

  const handleImageError = (): void => {
    if (currentImgSrc === token.imageUrl && token.backupImageUrl) {
      setCurrentImgSrc(token.backupImageUrl);
      return;
    }

    setImageError(true);
  };

  const isPositive = token.change24h >= 0;
  const area = width * height;
  const isTiny = area < 2200;
  const isSmall = area >= 2200 && area < 6800;

  const colorStrength = Math.min(Math.abs(token.change24h), 15) / 15;
  const positiveBase = mood === 'Playful' ? [24, 170, 84] : [34, 197, 94];
  const negativeBase = mood === 'Playful' ? [239, 68, 68] : [220, 38, 38];
  const base = isPositive ? positiveBase : negativeBase;
  const lift = Math.round(22 * colorStrength);
  const background = `rgb(${Math.min(base[0] + lift, 255)} ${Math.min(base[1] + lift, 255)} ${Math.min(base[2] + lift, 255)})`;

  const sizes = getResponsiveTextSizes(width, height);
  const showIcon = !isTiny && Boolean(currentImgSrc || imageError);
  const showPrice = !isTiny;
  const showChange = !isTiny;

  const ellipsisText: React.CSSProperties = {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  };

  return (
    <div
      style={{ width, height, opacity: dimmed ? 0.32 : 1, transition: 'opacity 180ms ease' }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={() => onClick(token)}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          border: '1px solid rgba(10, 18, 42, 0.55)',
          background,
          cursor: 'pointer',
          overflow: 'hidden',
          color: '#f8fafc',
          padding: isTiny ? 6 : isSmall ? 8 : 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isSmall ? 3 : 5,
          boxSizing: 'border-box',
          textShadow: '0 1px 8px rgba(0, 0, 0, 0.28)',
        }}
      >
        {showIcon && (
          currentImgSrc && !imageError ? (
            <img
              src={currentImgSrc}
              alt={token.symbol}
              style={{
                width: sizes.icon,
                height: sizes.icon,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.32)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}
              onError={handleImageError}
            />
          ) : (
            <div
              style={{
                width: sizes.icon,
                height: sizes.icon,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.14)',
                border: '2px solid rgba(255,255,255,0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: Math.max(Math.round(sizes.icon * 0.45), 10),
                flexShrink: 0,
              }}
            >
              {token.symbol.slice(0, 1)}
            </div>
          )
        )}

        <div style={{ ...ellipsisText, fontSize: sizes.symbol, fontWeight: 700, lineHeight: 1 }}>{token.symbol}</div>
        {showPrice && (
          <div style={{ ...ellipsisText, fontSize: sizes.price, fontWeight: 600, lineHeight: 1.05 }}>
            ${formatPrice(token.price)}
          </div>
        )}
        {showChange && (
          <div style={{ ...ellipsisText, fontSize: sizes.change, fontWeight: 600, lineHeight: 1.05 }}>
            {isPositive ? '+' : '-'}{formatChange(token.change24h)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenTile;
