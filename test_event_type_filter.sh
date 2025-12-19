#!/bin/bash

echo "Testing eventType filter..."
echo ""

echo "1. Search all events (no filter):"
curl -s "http://localhost:4000/api/event-search/search" | python -m json.tool | head -30
echo ""
echo ""

echo "2. Search for physical events:"
curl -s "http://localhost:4000/api/event-search/search?eventType=physical" | python -m json.tool | head -30
echo ""
echo ""

echo "3. Search for online events:"
curl -s "http://localhost:4000/api/event-search/search?eventType=online" | python -m json.tool | head -30
echo ""
echo ""

echo "4. Search for hybrid events:"
curl -s "http://localhost:4000/api/event-search/search?eventType=hybrid" | python -m json.tool | head -30
echo ""
echo ""

echo "5. Search with query + eventType:"
curl -s "http://localhost:4000/api/event-search/search?query=clubbera&eventType=online" | python -m json.tool | head -30
echo ""
echo ""

echo "6. Test invalid eventType (should return error):"
curl -s "http://localhost:4000/api/event-search/search?eventType=invalid" | python -m json.tool
