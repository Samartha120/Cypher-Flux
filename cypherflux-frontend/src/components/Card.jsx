import React from 'react';

const Card = ({
	title,
	value,
	Icon,
	iconClassName,
	accent,
	hoverTitle,
	items,
	emptyText,
	renderItem,
	onClick,
}) => {
	const hasItems = Array.isArray(items) && items.length > 0;

	return (
		<div className="glass-card stat-card metric-card" style={{ borderTop: `3px solid ${accent}` }} onClick={onClick}>
			<div className="metric-card__main">
				{Icon ? <Icon size={32} className={`card-icon ${iconClassName || ''}`} /> : null}
				<div className="stat-info">
					<h3>{title}</h3>
					<p className="stat-val">{value}</p>
				</div>
			</div>

			<div className="metric-hover" aria-hidden="true">
				<div className="metric-hover__inner" style={{ borderColor: accent }}>
					<h4 className="metric-hover__title">{hoverTitle || 'REAL-TIME DATA'}</h4>
					<div className="metric-hover__content">
						{!hasItems ? (
							<div className="metric-hover__empty">{emptyText || 'No data available.'}</div>
						) : (
							items.map((item, index) => (
								<div key={item?.id || index} className="metric-hover__row">
									{renderItem ? renderItem(item) : <pre className="metric-hover__pre">{JSON.stringify(item, null, 2)}</pre>}
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Card;

