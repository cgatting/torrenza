jest.mock('axios');
const axios = require('axios');
const { searchProvider } = require('./src/services/torrentSearch');
test('maps Pirate Bay results and skips the empty placeholder', async () => {
  axios.get.mockResolvedValueOnce({data: JSON.stringify([{name:'Example',info_hash:'A'.repeat(40),size:'1073741824',seeders:'8',leechers:'2'}, {name:'No results returned',info_hash:'0'.repeat(40)}])});
  const results = await searchProvider('The Pirate Bay', 'example & test');
  expect(axios.get.mock.calls[0][0]).toContain('example%20%26%20test');
  expect(results).toHaveLength(1);
  expect(results[0]).toMatchObject({title:'Example',size:'1.00 GB',seeds:8,peers:2});
  expect(results[0].magnet).toContain('btih:'+'A'.repeat(40));
});
test('maps YTS releases and handles empty results', async () => {
  axios.get.mockResolvedValueOnce({data: JSON.stringify({status:'ok',data:{movies:[{title:'Example',year:2020,torrents:[{hash:'B'.repeat(40),quality:'1080p',type:'web',seeds:4}]}]}})});
  const results = await searchProvider('YTS','example');
  expect(results[0]).toMatchObject({title:'Example 2020 1080p web',provider:'YTS',seeds:4});
  expect(results[0].magnet).toContain('btih:'+'B'.repeat(40));
  axios.get.mockResolvedValueOnce({data: JSON.stringify({status:'ok',data:{movie_count:0}})});
  expect(await searchProvider('YTS','missing')).toEqual([]);
});
test('reports malformed responses', async () => {
  axios.get.mockResolvedValueOnce({data:'<html>unavailable</html>'});
  await expect(searchProvider('YTS','example')).rejects.toThrow('Invalid response from YTS');
});

test.each(['Bitsearch', 'YourBittorrent', 'TorrentFunk'])('%s maps API results', async (provider) => {
  axios.get.mockResolvedValueOnce({ data: JSON.stringify({ results: [{ title: 'Ubuntu', infohash: 'C'.repeat(40), size: 1073741824, seeders: 5, leechers: 2 }] }) });
  const [result] = await searchProvider(provider, 'ubuntu-test');
  expect(result).toMatchObject({ title: 'Ubuntu', provider, seeds: 5, peers: 2, size: '1.00 GB' });
  expect(result.magnet).toContain('btih:' + 'C'.repeat(40));
});
