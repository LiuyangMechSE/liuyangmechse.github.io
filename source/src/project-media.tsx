import {useId} from 'react';
import Demo from './demos';
import type {Item} from './lib/content';
import {mediaSource} from './static-files';
import './project-media.css';

/** Keep an interactive explanation and its paper source in the same reading view. */
export default function ProjectMedia({item}: {item: Item}) {
  const figureCaptionId = useId();
  const hasPrimary = Boolean(item.media) || item.demo !== 'none';
  const paperFigure = item.figure?.src ? item.figure : undefined;
  if (!hasPrimary && !paperFigure) return null;

  return <div className={`entry-media project-media${hasPrimary && paperFigure ? ' project-media-paired' : ''}`}>
    {hasPrimary && <figure className="project-primary-media">
      {item.media ? (
        item.mediaType === 'video'
          ? <video src={mediaSource(item.media)} controls playsInline preload="metadata" aria-label={item.caption || item.title}/>
          : <img src={mediaSource(item.media)} alt={item.caption || item.title} loading="lazy" decoding="async"/>
      ) : item.demo !== 'none' ? <Demo kind={item.demo}/> : null}
      {item.caption && <figcaption>{item.caption}</figcaption>}
    </figure>}

    {paperFigure && <figure className="project-paper-figure" aria-labelledby={figureCaptionId}>
      <div className="project-paper-heading">From the paper</div>
      <a className="project-paper-image-link" href={mediaSource(paperFigure.src)} target="_blank" rel="noopener noreferrer" aria-label={`Open the paper figure for ${item.title} in a new tab`}>
        <img src={mediaSource(paperFigure.src)} alt={paperFigure.alt || `Paper figure illustrating ${item.title}`} loading="lazy" decoding="async"/>
        <span className="project-paper-expand" aria-hidden="true">Open full figure <span>↗</span></span>
      </a>
      <figcaption id={figureCaptionId}>
        {paperFigure.caption && <p className="project-paper-caption">{paperFigure.caption}</p>}
        {(paperFigure.sourceLabel || paperFigure.sourceUrl) && <p className="project-paper-source">
          {paperFigure.sourceUrl
            ? <a href={paperFigure.sourceUrl} target="_blank" rel="noopener noreferrer">{paperFigure.sourceLabel || 'Source paper'}</a>
            : paperFigure.sourceLabel}
        </p>}
      </figcaption>
    </figure>}
  </div>;
}
