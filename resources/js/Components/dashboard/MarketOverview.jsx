import React, { useState, useMemo, useEffect } from 'react';
import { Card, Table, Form, InputGroup, Pagination, Button } from 'react-bootstrap';
import { BsExclamationTriangle, BsSearch, BsInfoCircleFill } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';
import { formatPrice, formatPercentage, formatMarketCap } from '../../utils/formatters';

const MarketOverview = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/markets?per_page=250');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10 items per page


  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!data || !searchTerm) return data || [];
    
    return data.filter(coin => 
      coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil((filteredData?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData?.slice(startIndex, endIndex) || [];

  // Reset to first page when search term changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setItemsPerPage(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };


  if (loading && !data) return <LoadingSpinner />;

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0">Market Overview</h5>
            <Tooltip content="Live rankings of the top cryptocurrencies by market capitalization. Market cap is calculated by multiplying the current price by the circulating supply.">
              <BsInfoCircleFill className="text-muted" style={{ cursor: 'help' }} />
            </Tooltip>
            {lastFetch && <TimeAgo date={lastFetch} />}
          </div>
          <div className="d-flex align-items-center gap-2">
            <Form.Select 
              size="sm" 
              value={itemsPerPage} 
              onChange={handlePageSizeChange}
              style={{ width: 'auto' }}
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
              <option value="250">250 per page (All)</option>
            </Form.Select>
            {error && (
              <BsExclamationTriangle className="text-warning" title="Failed to update" />
            )}
          </div>
        </div>
        <InputGroup>
          <InputGroup.Text>
            <BsSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search coins..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </InputGroup>
      </Card.Header>
      <Card.Body className="p-0">
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Coin</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>Market Cap</th>
              <th>Volume (24h)</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((coin, index) => (
              <tr key={coin.id}>
                <td>{startIndex + index + 1}</td>
                <td>
                  <div className="d-flex align-items-center">
                    <img 
                      src={coin.image} 
                      alt={coin.name}
                      className="crypto-icon me-2"
                      width="20"
                      height="20"
                    />
                    <span className="fw-medium">{coin.name}</span>
                    <span className="text-muted ms-1">{coin.symbol.toUpperCase()}</span>
                  </div>
                </td>
                <td className="font-monospace">{formatPrice(coin.current_price)}</td>
                <td className={coin.price_change_percentage_24h >= 0 ? 'text-success' : 'text-danger'}>
                  {formatPercentage(coin.price_change_percentage_24h)}
                </td>
                <td>{formatMarketCap(coin.market_cap)}</td>
                <td>{formatMarketCap(coin.total_volume)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        
        {filteredData.length === 0 && searchTerm && (
          <div className="text-center text-muted py-3">
            No coins found matching "{searchTerm}"
          </div>
        )}
      </Card.Body>
      
      {totalPages > 1 && (
        <Card.Footer>
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} 
              {searchTerm && ` filtered`} coins
              {!searchTerm && data && ` (Top ${data.length} by market cap)`}
            </div>
            <Pagination className="mb-0" size="sm">
              <Pagination.First 
                onClick={() => handlePageChange(1)} 
                disabled={currentPage === 1}
              />
              <Pagination.Prev 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 1}
              />
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <Pagination.Item
                      key={page}
                      active={page === currentPage}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Pagination.Item>
                  );
                } else if (
                  page === currentPage - 3 || 
                  page === currentPage + 3
                ) {
                  return <Pagination.Ellipsis key={page} disabled />;
                }
                return null;
              })}
              
              <Pagination.Next 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
              />
              <Pagination.Last 
                onClick={() => handlePageChange(totalPages)} 
                disabled={currentPage === totalPages}
              />
            </Pagination>
          </div>
        </Card.Footer>
      )}
    </Card>
  );
};

export default MarketOverview;
