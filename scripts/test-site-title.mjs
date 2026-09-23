import test from 'node:test';
import assert from 'node:assert/strict';
import { brandFromTitle, titleFromHtml, fetchPublishedBrand, cardTitle } from './site-title.mjs';

test('new challenge days use the café name from HTML title', () => {
  assert.equal(titleFromHtml('<!doctype html><head><title>Plere · Beech Road, Chorlton</title></head>'), 'Plere');
  assert.equal(titleFromHtml('<head><title> 99 Reasons — Your place, all day long. </title></head>'), '99 Reasons');
  assert.equal(titleFromHtml('<head><title>Sandy\'s Smokeshed — BBQ under the arches</title></head>'),
    "Sandy's Smokeshed");
  assert.equal(titleFromHtml('<head><title>Kiku Hifi — Coffee &amp; Listening Bar, Liverpool</title></head>'),
    'Kiku Hifi');
});

test('titles may be multi-line, entity-encoded, or prefixed by Home', () => {
  assert.equal(titleFromHtml('<head>\n<title>Home | Açaí Social Club — Leeds</title>\n</head>'),
    'Açaí Social Club');
  assert.equal(titleFromHtml('<head><title>Soup &amp; Bowl | Manchester</title></head>'),
    'Soup & Bowl');
  assert.equal(titleFromHtml('<head><title>Woods&#39; Café &mdash; Chorlton</title></head>'),
    "Woods' Café");
});

test('invalid, generic, 404 and absent titles never replace a business name', () => {
  assert.equal(titleFromHtml('<head><title>Day-13</title></head>'), '');
  assert.equal(titleFromHtml('<head><title>404 - Page not found</title></head>'), '');
  assert.equal(titleFromHtml('<body><h1>Not the title tag</h1></body>'), '');
  assert.equal(brandFromTitle('Home'), '');
});

test('published title tag wins; curated business name is the fallback', () => {
  assert.equal(cardTitle({ override:'Real Café',published:'Published Café',previous:'Day 12',repository:'Day-12' }),
    'Published Café');
  assert.equal(cardTitle({ override:'Real Café',published:'',previous:'Day 12',repository:'Day-12' }),
    'Real Café');
  assert.equal(cardTitle({ override:'',published:'Plere',previous:'Day 12',repository:'Day-12' }), 'Plere');
  assert.equal(cardTitle({ override:'',published:'',previous:'Plere',repository:'Day-12' }), 'Plere');
  assert.equal(cardTitle({ override:'',published:'',previous:'',repository:'Day 12' }), 'Day 12');
});

test('published titles are fetched separately from the cached screenshot', async () => {
  let requested = 0;
  const fetcher = async (url, options) => {
    requested++;
    assert.equal(url, 'https://patu-art.github.io/Day-12/');
    assert.equal(options.redirect, 'error');
    return {
      ok:true,headers:new Headers({ 'content-type':'text/html; charset=utf-8' }),
      text:async () => '<head><title>Plere · Beech Road, Chorlton</title></head>'
    };
  };
  assert.equal(await fetchPublishedBrand('https://patu-art.github.io/Day-12/', fetcher), 'Plere');
  assert.equal(requested, 1);
  assert.equal(await fetchPublishedBrand('', fetcher), '');
  assert.equal(requested, 1);
});
