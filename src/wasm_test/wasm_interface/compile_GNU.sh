#!/bin/bash -e

echo "Compiling with GNU..."

g++ -std=c++11 -O3 -fpermissive -o Program main.cpp ../model/Calculations.cpp

