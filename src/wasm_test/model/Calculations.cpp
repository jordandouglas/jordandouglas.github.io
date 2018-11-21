

#include "Calculations.h"


#include <iostream>
#include <vector>
#include <list>
#include <string>
#include <map>


using namespace std;


// Constructor
Calculations::Calculations(){


}


// Adds two numbers together
double Calculations::add(double n1, double n2){

	

	cout << "Adding " << n1 << " and " << n2 << endl;
	double sum = n1 + n2;
	return sum;



}

