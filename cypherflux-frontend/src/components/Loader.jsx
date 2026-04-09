import React from 'react';

const Loader = ({ label = 'Loading...' }) => {
	return (
		<div className="loader" role="status" aria-live="polite">
			<div className="loader__spinner" />
			{label ? <div className="loader__label">{label}</div> : null}
		</div>
	);
};

export default Loader;

