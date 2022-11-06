#!/bin/sh

# sudo apt-get install dssp

cd data

rm -f structures.txt
touch structures.txt


rm -r dssp
mkdir -p dssp
for f in structures/*.pdb;
do

	echo $f
	echo $f >> structures.txt
	mkdssp -i $f -o $f.dssp
	mv $f.dssp dssp/.
	#../../../dssp2pdb.R  dssp/$f.dssp

done


../../../../../DeepAlign/3DCOMB -i structures.txt -o align