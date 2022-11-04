#!/bin/sh


../../../../../DeepAlign-1.135-2/3DCOMB -i structures.txt -o align


mkdir -p dssp
for f in structures/*.pdb;
do

	echo $f
	mkdssp -i $f -o $f.dssp
	mv $f.dssp dssp/.
done


