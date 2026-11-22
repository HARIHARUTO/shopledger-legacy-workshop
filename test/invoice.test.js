'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

test('invoice uses the billed HSN GST rate for order lines', function () {
  // This is the line shape created by routes/orders.js: HSN is stored, gstRate is not.
  const items = [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 2 }];
  const billed = pricing.computeTotals(items, '');
  const invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(billed.tax, 10);
  assert.equal(invoiceFigures.rows[0].gstPercent, 5);
  assert.equal(invoiceFigures.tax, billed.tax);
  assert.equal(invoiceFigures.total, billed.total);
});

test('invoice matches the billed capped coupon discount and totals', function () {
  const items = [{ id: 1, name: 'Rice', hsn: '1006', price: 3000, qty: 1 }];
  const billed = pricing.computeTotals(items, 'SAVE10');
  const invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.deepEqual(
    { discount: invoiceFigures.discount, tax: invoiceFigures.tax, total: invoiceFigures.total },
    { discount: billed.discount, tax: billed.tax, total: billed.total }
  );
});

test('invoice GST and split match the billed per-line rounded GST', function () {
  const items = [
    { id: 1, name: 'Small item A', hsn: '1006', gstRate: 10, price: 0.05, qty: 1 },
    { id: 2, name: 'Small item B', hsn: '1006', gstRate: 10, price: 0.05, qty: 1 }
  ];
  const billed = pricing.computeTotals(items, '');
  const invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(invoiceFigures.rows.reduce(function (sum, row) { return sum + row.lineTax; }, 0), 0.02);
  assert.equal(invoiceFigures.tax, billed.tax);
  assert.equal(invoiceFigures.cgst, billed.cgst);
  assert.equal(invoiceFigures.sgst, billed.sgst);
});

test('invoice ignores an inactive coupon just as billing does', function () {
  const items = [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  const billed = pricing.computeTotals(items, 'DIWALI20');
  const invoiceFigures = invoice.computeInvoiceFigures({ items: items, coupon: 'DIWALI20' });

  assert.equal(invoiceFigures.discount, 0);
  assert.equal(invoiceFigures.tax, billed.tax);
  assert.equal(invoiceFigures.total, billed.total);
});
