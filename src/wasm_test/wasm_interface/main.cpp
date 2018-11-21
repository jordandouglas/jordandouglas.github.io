

#include "../model/Calculations.h"




#include <iostream>
#include <string>
#include <chrono>
#include <ctime>

using namespace std;





int main(int argc, char** argv) { 

    
    auto startTime = std::chrono::system_clock::now();


    cout << "Loading main" << endl;
    

    Calculations* calculator = new Calculations();
    double sum = calculator->add(5, 20);
    cout << "5 + 20 = " << sum << endl;
	


    // If you create something using 'new' you have to delete it (and all of its * references) or you will get a memory leak!
    delete calculator;

    
    auto endTime = std::chrono::system_clock::now();
    std::chrono::duration<double> elapsed_seconds = endTime-startTime;
    cout << "Done! Time elapsed: " << elapsed_seconds.count() << "s" << endl;

    return 0;

}