import React from 'react';

const Table = ({ headers, data, renderRow, loading = false, emptyMessage = "No records found." }) => {
  return (
    <div className="table-container glass-card" style={{ overflowX: 'auto', padding: '20px' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} style={{ 
                textAlign: 'left', 
                padding: '12px 15px', 
                color: 'var(--neon-blue)', 
                fontSize: '0.85rem', 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px',
                borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <div className="loader-mini" style={{ marginBottom: '10px' }}></div>
                Accessing encrypted data...
              </td>
            </tr>
          ) : data && data.length > 0 ? (
            data.map((item, index) => (
              <tr key={index} className="table-row" style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                transition: 'all 0.3s'
              }}>
                {renderRow(item, index)}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
