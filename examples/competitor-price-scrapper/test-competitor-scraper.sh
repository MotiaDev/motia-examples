#!/bin/bash

# Test script for Competitor Price Scraper workflow

echo "=== Testing Competitor Price Scraper ==="
echo ""

# Test 1: Structured product data
echo "Test 1: Sending structured product data..."
curl -X POST http://localhost:3000/competitor-price-scraper \
  -H "Content-Type: application/json" \
  -d '{
    "competitorName": "TechStore Pro",
    "products": [
      {
        "name": "iPhone 15 Pro",
        "price": 999.99,
        "currency": "USD",
        "url": "https://techstore.com/iphone15pro"
      },
      {
        "name": "MacBook Air M3",
        "price": 1299.00,
        "currency": "USD",
        "url": "https://techstore.com/macbook-air"
      },
      {
        "name": "AirPods Pro",
        "price": 249.99,
        "currency": "USD",
        "url": "https://techstore.com/airpods-pro"
      }
    ]
  }' | jq .

echo ""
echo "Waiting 5 seconds before next test..."
sleep 5

# Test 2: Raw text data
echo ""
echo "Test 2: Sending raw text data..."
curl -X POST http://localhost:3000/competitor-price-scraper \
  -H "Content-Type: application/json" \
  -d '{
    "competitorName": "ElectroMart",
    "rawData": "SALE! Limited time offers on premium electronics. The latest Samsung Galaxy S24 Ultra is now available for just $1199, down from $1399. Save $200! We also have the Google Pixel 8 Pro at $899 (was $999) and the OnePlus 12 for only $799. All phones come with free shipping and a 2-year warranty. Our tablet deals include iPad Pro 12.9 at $1099 and Samsung Galaxy Tab S9 Ultra at $999. Check out our laptop section where Dell XPS 15 is priced at $1599 and HP Spectre x360 at $1299.",
    "timestamp": "2024-01-20T15:30:00Z"
  }' | jq .

echo ""
echo "Waiting 5 seconds before next test..."
sleep 5

# Test 3: Mixed data (both structured and raw)
echo ""
echo "Test 3: Sending mixed data (structured + raw)..."
curl -X POST http://localhost:3000/competitor-price-scraper \
  -H "Content-Type: application/json" \
  -d '{
    "competitorName": "MegaElectronics",
    "products": [
      {
        "name": "Sony WH-1000XM5",
        "price": 349.99,
        "currency": "USD"
      }
    ],
    "rawData": "Flash deal on gaming consoles! PS5 Slim now at $449, Xbox Series X at $479. Limited stock!",
    "timestamp": "2024-01-20T16:00:00Z"
  }' | jq .

echo ""
echo "=== Testing Complete ==="
echo "Check the logs for workflow execution details"
echo "If Google Sheets logging is enabled, check your spreadsheet"
echo "For errors, check the #alerts channel in Slack"
