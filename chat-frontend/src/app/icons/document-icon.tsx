import React from 'react';

const DocumentIcon: React.FC = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 96 96"
            fill="none"
        >
            <circle cx="48" cy="48" r="48" fill="#33B8B8" />
            <path
                d="M21 64V32C21 27.5817 24.5817 24 29 24H51.8089C53.8578 24 55.8286 24.7861 57.315 26.1963L72.0061 40.134C73.5983 41.6445 74.5 43.7429 74.5 45.9377V64C74.5 68.4183 70.9183 72 66.5 72H29C24.5817 72 21 68.4183 21 64Z"
                fill="white"
                stroke="white"
                strokeWidth="3"
            />
        </svg>
    );
};

export default DocumentIcon;
