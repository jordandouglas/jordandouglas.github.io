/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of SimPol.

    SimPol is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SimPol is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SimPol.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/


#include "Settings.h"
#include "Simulator.h"
#include "State.h"
//#include "sfmt/include/sfmt/SFMT.h"
#include "randomc/randomc.h"
//#include "RandomLib/Random.hpp"


//#include "RandomTest-master/CmRandom.h"
//#include "RandomTest-master/CmDistribution.h"

#include <iostream>
#include <vector>
#include <random>
#include <chrono>
#include <ctime>

using namespace std;


// TODO: garbage collection

Simulator::Simulator(){

	// Each simulator instance has its own mersenne twister instance to allow multithreading
	random_device rd; 
	sfmt = new CRandomMersenne(rd());

	simulateForMilliSeconds = -1;

}



/*
void Simulator::timer_start(unsigned int interval) {
    thread([interval]() {
        this_thread::sleep_for(chrono::milliseconds(interval));
        cout << "Time's up" << endl;
    }).detach();
}
*/



// Returns the mean velocity acros N trials
double Simulator::perform_N_Trials(int N, State* state, bool verbose){



	//Simulator::timer_start(1000);

	//Settings::print();

	//currentModel->print();
	simulateForMilliSeconds = -1; 
	
	if (verbose) {
		cout << "Performing " << N << " trials" << endl;
		//cout << templateSequence << endl;
		if (currentModel->get_assumeBindingEquilibrium()) cout << "Binding assumed to be at equilibrium" << endl;
		if (currentModel->get_assumeTranslocationEquilibrium()) cout << "Translocation assumed to be at equilibrium" << endl;
	}

	//state->transcribe(10);
	//state->print();

	//cout << "bck = " <<  state->calculateBackwardRate(true) << endl;


	double meanMeanVelocity = 0;
	double meanMeanTime = 0;
	//vector<double> velocities(N);
	//vector<double> times(N);
	State* clonedState;
	for (int n = 1; n <= N; n ++){
		if (verbose && (n == 1 || n % 100 == 0)) cout << "Starting trial " << n << endl;

		double result[2];
		clonedState = state->clone();
		performSimulation(clonedState, result);
		delete clonedState;
		meanMeanVelocity += result[0] / N;
		meanMeanTime += result[1] / N;
		//velocities.at(n-1) = result[0];
		//times.at(n-1) = result[1];
	}



	if (verbose) {

		// Calculate standard deviations
		/*
		double sdVelocity = 0;
		double sdTime = 0;
		for (int n = 1; n <= N; n ++){
			sdVelocity += pow(velocities.at(n-1) - meanMeanVelocity, 2) / N;
			sdTime += pow(times.at(n-1) - meanMeanTime, 2) / N;
		}
		sdVelocity = sqrt(sdVelocity);
		sdTime = sqrt(sdTime);
		*/

		//cout << "Mean velocity = " << meanMeanVelocity << "bp/s (sd = " << sdVelocity << ")"<< endl;
		//cout << "Mean time to copy template = " << meanMeanTime << "s (sd = " << sdTime << ")" << endl;

		cout << "Mean velocity = " << meanMeanVelocity << "bp/s" << endl;
		cout << "Mean time to copy template = " << meanMeanTime << "s" << endl;
	}


	return meanMeanVelocity;


}


// Performs upto N trials and then returns with whatever progress has been made after msUntilStop has elapsed
void Simulator::perform_N_Trials_and_stop(int N, State* state, double msUntilStop, double* toReturn){

	nTrialsTotalGUI = N;
	nTrialsCompletedGUI = 0;
	simulateForMilliSeconds = msUntilStop;
	delete currentGUIState;

	//this->timer_start(1000);

	// Simulate until time elapses
	double meanMeanVelocity = 0;
	double meanMeanTime = 0;
	State* initialState = new State(true);
	State* clonedState;
	for (int n = 1; n <= N; n ++){
		if (n == 1 || n % 100 == 0) cout << "Starting trial " << n << endl;

		double result[2];
		clonedState = initialState->clone();
		performSimulation(clonedState, result);

		// If the velocity -1, then the current simulation was interrupted by a timeout
		if (result[0] < 0){
			currentGUIState = clonedState;
			inSimulationTimeElapsedCurrentSimulation = result[1];
		}
		else {
			nTrialsCompletedGUI++;
			meanMeanVelocity += result[0];
			meanMeanTime += result[1];
			delete clonedState;
		}

	}



}


// Resumes the trials initiated by perform_N_Trials_and_stop() and then returns with whatever progress has been made after msUntilStop has elapsed
void Simulator::resume_trials(double* toReturn){


}


double Simulator::rexp(double rate){
	return -log(runif()) / rate;
	//return -log(sfmt->Random()) / rate;
}


double Simulator::runif(){
	//return this->distribution(this->generator);
	return sfmt->Random();
	//return (double)generator()/generator.max();
}


void Simulator::performSimulation(State* s, double* toReturn) {



	
	double timeElapsed = 0;

	// Detect if the polymerase has stalled at a position
	int lastBaseTranscribed = s->get_nascentLength();
	double timeElapsedSinceLastCatalysis = 0;

	chrono::system_clock::time_point startTime;
	if (simulateForMilliSeconds != -1) startTime = chrono::system_clock::now();
	
	while(!s->isTerminated() && !stop){



		// Check if GUI timeout has been reached (if there is a timeout)
		if (simulateForMilliSeconds != -1){
			auto timeElapsed = chrono::system_clock::now();

		} 



		// Arrest if timeout has been reached
		if (arrestTime->getVal() != 0 && timeElapsedSinceLastCatalysis >= arrestTime->getVal()){
			break;
		}


		if (s->get_mRNAPosInActiveSite() <= 1 && s->get_mRNAPosInActiveSite() + s->get_nascentLength() + 1 > templateSequence.length()) break;


		// If NTP is not bound and we are in posttranslocated state, and user has requested to assume binding equilibrium but NOT translocation
		bool justBindingEquilibrium =     currentModel->get_assumeBindingEquilibrium() 
								 && !currentModel->get_assumeTranslocationEquilibrium() 
								 && s->get_mRNAPosInActiveSite() == 1 && !s->NTPbound();


		// If NTP is not bound and we are in pre/posttranslocated state, and user has requested to assume translocation equilibrium but NOT binding
		bool justTranslocationEquilibrium =  !currentModel->get_assumeBindingEquilibrium()
											&&  currentModel->get_assumeTranslocationEquilibrium() 
											&& (s->get_mRNAPosInActiveSite() == 0 || s->get_mRNAPosInActiveSite() == 1) && !s->NTPbound();



		// If we are in pre/posttranslocated state, and user has requested to assume translocation equilibrium AND binding equilibrium
		bool bindingAndTranslocationEquilibrium =   currentModel->get_assumeBindingEquilibrium()
													&& currentModel->get_assumeTranslocationEquilibrium() 
													&& (s->get_mRNAPosInActiveSite() == 0 || s->get_mRNAPosInActiveSite() == 1) && !s->NTPbound();


		bool nothingEquilibrium = !justBindingEquilibrium && !justTranslocationEquilibrium && !bindingAndTranslocationEquilibrium;







		bool beforeEndOfTemplate = s->get_nascentLength() + 1 < templateSequence.length();
		bool afterStartOfTemplate = s->get_nascentLength() > s->get_initialLength();
		double geometricTime = -1;
		if (currentModel->get_allowGeometricCatalysis() && beforeEndOfTemplate && afterStartOfTemplate && !bindingAndTranslocationEquilibrium && (s->get_mRNAPosInActiveSite() == 0 || s->get_mRNAPosInActiveSite() == 1)){


			// Geometric sampling speed boost for when nothing is kinetic (and backtracking/hypertranslocation prohibited)
			if (nothingEquilibrium && !currentModel->get_allowBacktracking() && !currentModel->get_allowHypertranslocation() && s->get_mRNAPosInActiveSite() == 1) {
				geometricTime = geometricTranslocationBindingSampling(s);
			}


			// Geometric sampling speed boost for when just binding is kinetic (or both kinetic but backtracking/hypertranslocation are not prohibited)
			else if ((nothingEquilibrium && s->get_mRNAPosInActiveSite() == 1) || justTranslocationEquilibrium){
				geometricTime = geometricBindingSampling(s);
			}

			// Geometric sampling speed boost for when translocation is kinetic and binding is at equilibrium
			else if (justBindingEquilibrium && !currentModel->get_allowBacktracking() && !currentModel->get_allowHypertranslocation() && s->get_mRNAPosInActiveSite() == 1){
				geometricTime = geometricTranslocationSampling(s);
			}


		}


		// Geometric sampling was a success. End of trial
		if (geometricTime != -1){
			//cout << "geometricTime" << endl;
			timeElapsed += geometricTime;
			if (s->get_nascentLength() != lastBaseTranscribed){
				timeElapsedSinceLastCatalysis = 0;
				lastBaseTranscribed = s->get_nascentLength();
			} 
			else timeElapsedSinceLastCatalysis += geometricTime;
		}


		// Geometric sampling did not apply. Do it the normal way
		if (geometricTime == -1) {


			// Calculate the initial rates (these may be modified if any equilibirum assumptions are made)
			double kBck = s->calculateBackwardRate(true, false);
			double kFwd = s->calculateForwardRate(true, false);
			double kRelease = s->calculateReleaseNTPRate(false);
			double kBindOrCat = s->calculateBindNTPrate(false);




			// Assume equilbirium between bound and unbound states but NOT pre and post translocated states
			if (justBindingEquilibrium){

				//cout << "justBindingEquilibrium" << endl;

				// Calculate probability of NTP being bound or unbound. If concentration is zero it will never bind
				double KD = Kdiss->getVal();
				double NTPconcentration = 0;
				if (currentModel->get_useFourNTPconcentrations()){
					string toBind = Settings::complementSeq(templateSequence.substr(s->get_nascentLength(),1), PrimerType.substr(2) == "RNA");
					if (toBind == "A") NTPconcentration = ATPconc->getVal();
					else if (toBind == "C") NTPconcentration = CTPconc->getVal();
					else if (toBind == "G") NTPconcentration = GTPconc->getVal();
					else if (toBind == "U" || toBind == "T") NTPconcentration = UTPconc->getVal();
				}
				else NTPconcentration = NTPconc->getVal();
				double probabilityBound = (NTPconcentration/KD) / (NTPconcentration/KD + 1);
				double probabilityUnbound = 1 - probabilityBound;


				// Mofify the rates
				kBindOrCat = kCat->getVal() * probabilityBound; // Can only catalyse if NTP bound
				kFwd = kFwd * probabilityUnbound; // Can only translocate if NTP is not bound
				kBck = kBck * probabilityUnbound;


			}


			// Assume equilbirium between pre and post translocated states but NOT between bound and unbound states
			else if (justTranslocationEquilibrium){


				// Get rate of translocating from 0 to -1
				int currentTranslocationPosition = s->get_mRNAPosInActiveSite();

				if (s->get_mRNAPosInActiveSite() == 1)  s->backward(); 
				double k0_1 = s->calculateForwardRate(true, true);
				double k0_minus1 = s->calculateBackwardRate(true, true);


				// Get rate of translocating from 1 to 2
				s->forward(); 
				s->set_terminated(false);
				double k1_0 = s->calculateBackwardRate(true, true);
				double k1_2 = s->calculateForwardRate(true, true);

				// Move back to original position
				s->set_mRNAPosInActiveSite(currentTranslocationPosition);



				double eqConstantFwdTranslocation = k0_1 / k1_0;
				double probabilityPosttranslocated = 1;
				double probabilityPretranslocated = 0;

				if (eqConstantFwdTranslocation != INFINITY){
					probabilityPosttranslocated = eqConstantFwdTranslocation / (eqConstantFwdTranslocation + 1);
					probabilityPretranslocated = 1 - probabilityPosttranslocated;
				}


				//console.log("k0_1", k0_1, "k1_0", k1_0, "probabilityPosttranslocated", probabilityPosttranslocated);
				

				// Can only bind NTP if not beyond the end of the sequence, go forward to terminate
				if (s->get_mRNAPosInActiveSite() + 1 < templateSequence.length()) kBindOrCat = s->calculateBindNTPrate(true) * probabilityPosttranslocated;
				else kBindOrCat = 0;


				kFwd = k1_2 * probabilityPosttranslocated; // Can only enter hypertranslocated state from posttranslocated
				kBck = k0_minus1 * probabilityPretranslocated; // Can only backtrack from pretranslocated


			}


			// Assume equilbirium between pre and post translocated states AND between bound and unbound states
			else if (bindingAndTranslocationEquilibrium){


				//if (s->get_nascentLength() == 4028){
					//cout << "XXX" << endl;
				//}



				// Get rate of translocating from 0 to -1
				int currentTranslocationPosition = s->get_mRNAPosInActiveSite();

				if (s->get_mRNAPosInActiveSite() == 1)  s->backward(); 
				double k0_1 = s->calculateForwardRate(true, true);
				double k0_minus1 = s->calculateBackwardRate(true, true);
				//double boltzmannG0 = exp(-(s->calculateTranslocationFreeEnergy()));


				// Get rate of translocating from 1 to 2
				s->forward(); 
				s->set_terminated(false);
				double k1_0 = s->calculateBackwardRate(true, true);
				double k1_2 = s->calculateForwardRate(true, true);
				//double boltzmannG1 = exp(-(s->calculateTranslocationFreeEnergy()));

				// Move back to original position
				s->set_mRNAPosInActiveSite(currentTranslocationPosition);


				double boltzmannG0 = 0;
				double boltzmannG1 = 1;
				double boltzmannGN = 0;
				if (k1_0 != 0){
					boltzmannG0 = 1;
					boltzmannG1 = k0_1 / k1_0;
				}
				

				//console.log("sampledBaseToAdd", sampledBaseToAdd);


				// Get KD and [NTP]
				if (s->get_mRNAPosInActiveSite() + 1 < templateSequence.length()){


					kBindOrCat = s->calculateBindNTPrate(true);
					if (kBindOrCat != 0){

						double NTPconcentration = 0;
						if (currentModel->get_useFourNTPconcentrations()){
							string toBind = Settings::complementSeq(templateSequence.substr(s->get_nascentLength(),1), PrimerType.substr(2) == "RNA");
							if (toBind == "A") NTPconcentration = ATPconc->getVal();
							else if (toBind == "C") NTPconcentration = CTPconc->getVal();
							else if (toBind == "G") NTPconcentration = GTPconc->getVal();
							else if (toBind == "U" || toBind == "T") NTPconcentration = UTPconc->getVal();
						}
						else NTPconcentration = NTPconc->getVal();

						double KD = Kdiss->getVal();
						boltzmannGN = boltzmannG1 * NTPconcentration / KD;
					}

				}





			


				// Calculate the probabilities of being in the 3 states (0, 1 and 1N)
				/*
				var A = KD / NTPconc;
				var B = k0_1 / k1_0;
				var probabilityPretranslocated = A / (A*B + A + B);
				var probabilityPosttranslocated = A*B / (A*B + A + B);
				var probabilityBound = B / (A*B + A + B);
				*/


				double normalisationZ = boltzmannG0 + boltzmannG1 + boltzmannGN;

				double probabilityPretranslocated = boltzmannG0 / normalisationZ;
				double probabilityPosttranslocated = boltzmannG1 / normalisationZ;
				double probabilityBound = boltzmannGN / normalisationZ;
			


				//console.log("probabilityPretranslocated", probabilityPretranslocated, "probabilityPosttranslocated", probabilityPosttranslocated, "probabilityBound", probabilityBound);

			

				// Can only catalyse if not beyond the end of the sequence, go forward to terminate
				if (s->get_nascentLength() + 1 < templateSequence.length()){
					kBindOrCat = kCat->getVal() * probabilityBound; // Can only catalyse if NTP bound
				}


				kFwd = k1_2 * probabilityPosttranslocated; // Can only enter hypertranslocated state from posttranslocated
				kBck = k0_minus1 * probabilityPretranslocated; // Can only backtrack from pretranslocated

				//console.log("probabilityPretranslocated", probabilityPretranslocated, "probabilityPosttranslocated", probabilityPosttranslocated, "probabilityBound", probabilityBound);



			}


			//s->print();
			double rates[] = { kBck, kFwd, kRelease, kBindOrCat };
			int numReactions = (sizeof(rates)/sizeof(*rates));
			//cout << "kfwd = " << s->calculateForwardRate(true) << endl;

			//cout << rates[0] << "," << rates[1] << "," << rates[2] << "," << rates[3] << "|" << numReactions << endl;





			double rateSum = 0;
			for (int i = 0; i < numReactions; i ++) {
				//cout << rates.at(i) << ", ";
				rateSum += rates[i];
			}
			//cout << endl;
			
			if (rateSum <= 0){
				cout << "No operations to apply" << endl;
				s->print();
				exit(1);
				break;
			}
 			
			
			// Generate a random number to determine which reaction to apply
			double runifNum = runif() * rateSum; //runif() * rateSum;
			double cumsum = 0;
			int reactionToDo = -1;
			
			
			for (int i = 0; i < numReactions; i ++) {
				cumsum += rates[i];
				if (runifNum < cumsum) {
					reactionToDo = i;
					break;
				}
			}
			
			
			
			double reactionTime = rexp(rateSum); // Random exponential
			
			

			//cout << "sampled reaction " << reactionToDo  << ", time elapsed = " << timeElapsed << endl;

			int actionsToDoList[3] = {reactionToDo, -2, -2};

			// If assume binding equilibrium and sampled catalysis then this is actually a double operation (bind then catalysis)
			if (justBindingEquilibrium && reactionToDo == 3) {
				actionsToDoList[0] = 3;
				actionsToDoList[1] = 3;
			}

			// If assume translocation equilibrium
			else if (justTranslocationEquilibrium){

				if (reactionToDo == 3 && s->get_mRNAPosInActiveSite() == 0){

					// Need to be in posttranslocated state before binding 
					actionsToDoList[0] = 1;
					actionsToDoList[1] = 3;
				}

				else if (reactionToDo == 1 && s->get_mRNAPosInActiveSite() == 0) {

					// Need to be in posttranslocated state before moving forward 
					actionsToDoList[0] = 1;
					actionsToDoList[1] = 1;
				}

				else if (reactionToDo == 0 && s->get_mRNAPosInActiveSite() == 1) {

					// Need to be in pretranslocated state before moving backwards 
					actionsToDoList[0] = 0;
					actionsToDoList[1] = 0;
				}

			}

			// If assume binding AND translocation equilibrium. NTP is required to be unbound
			else if (bindingAndTranslocationEquilibrium){

				if (reactionToDo == 3 && s->get_mRNAPosInActiveSite() == 0){

					// Forward, bind, catalyse
					actionsToDoList[0] = 1;
					actionsToDoList[1] = 3;
					actionsToDoList[2] = 3;
				}

				else if (reactionToDo == 3 && s->get_mRNAPosInActiveSite() == 1) {

					// Bind, catalyse
					actionsToDoList[0] = 3;
					actionsToDoList[1] = 3;
				}

				else if (reactionToDo == 1 && s->get_mRNAPosInActiveSite() == 0) {

					// Forward, forward
					actionsToDoList[0] = 1;
					actionsToDoList[1] = 1;
				}

				else if (reactionToDo == 0 && s->get_mRNAPosInActiveSite() == 1) {

					// Backwards, backwards
					actionsToDoList[0] = 0;
					actionsToDoList[1] = 0;
				}

			}



			// Apply the reaction(s)
			for (int i = 0; i < 3; i ++){
				if (actionsToDoList[i] == -2) break;
				executeAction(s, actionsToDoList[i]);
			}


			timeElapsed += reactionTime;

			if (s->get_nascentLength() != lastBaseTranscribed){
				timeElapsedSinceLastCatalysis = 0;
				lastBaseTranscribed = s->get_nascentLength();
			} 
			else timeElapsedSinceLastCatalysis += reactionTime;


		}
		
		//s.print();
	}
	
	
	// Calculate mean velocity
	int distanceTravelled = s->get_nascentLength() - s->get_initialLength();
	double velocity = distanceTravelled / timeElapsed;
	/*cout << "distanceTravelled = " << distanceTravelled << endl;
	cout << "timeElapsed = " << timeElapsed << endl;
	cout << "kcat " << kCat->getVal() << " KD " << Kdiss->getVal() << "[ATP] = " << ATPconc->getVal() << "F = " << FAssist->getVal() << "DGslide = " << GDagSlide->getVal() << endl;
	cout << "Trans eq: " << currentModel->get_assumeTranslocationEquilibrium() << " Bind eq " << currentModel->get_assumeBindingEquilibrium() << endl;
	*/
	//cout << s->get_initialLength() << ";" "distanceTravelled = " << distanceTravelled << endl;
	toReturn[0] = velocity;
	toReturn[1] = timeElapsed;
	
	
}


// Assumes binding to be at equilibrium
double Simulator::geometricTranslocationSampling(State* s){

	if (s->isTerminated()) return 0;
	if (s->NTPbound()) return 0;
	if (s->get_mRNAPosInActiveSite() != 1) return 0;



	// Get forward and backward rates
	double kBck = s->calculateBackwardRate(true, true);
	s->backward(); 
	double kFwd  = s->calculateForwardRate(true, true);
	s->forward();


	// Get time spent in bound and unbound states
	double KD = Kdiss->getVal();
	double NTPconcentration = 0;
	if (currentModel->get_useFourNTPconcentrations()){
		string toBind = Settings::complementSeq(templateSequence.substr(s->get_nascentLength(),1), PrimerType.substr(2) == "RNA");
		if (toBind == "A") NTPconcentration = ATPconc->getVal();
		else if (toBind == "C") NTPconcentration = CTPconc->getVal();
		else if (toBind == "G") NTPconcentration = GTPconc->getVal();
		else if (toBind == "U" || toBind == "T") NTPconcentration = UTPconc->getVal();
	}
	else NTPconcentration = NTPconc->getVal();
	double probabilityBound = (NTPconcentration/KD) / (NTPconcentration/KD + 1);
	double probabilityUnbound = 1 - probabilityBound;


	// Mofify the rates
	double kcat = kCat->getVal() * probabilityBound; // Can only catalyse if NTP bound
	kBck = kBck * probabilityUnbound; // Can only translocate if NTP is not bound


	// While next action is not catalysis
	double rate = kBck + kcat; 


	// Keep sampling until it is NOT back-forward
	double runifNum = runif() * rate;
	double totalReactionTime = 0;
	while(runifNum < kBck){
		totalReactionTime += rexp(rate);  // Time taken to go back
		totalReactionTime += rexp(kFwd); // Time taken to come forward again
		runifNum = runif() * rate;
	}


	// Time taken for catalysis
	totalReactionTime += rexp(rate);


	// Actions to do: bind, catalyse
	int actionsToDoList[2] = {3, 3};
	for (int i = 0; i < 2; i ++){
		executeAction(s, actionsToDoList[i]);
	}
	
	return totalReactionTime;

}





// Assumes neither binding nor translocation to be at equilibrium
double Simulator::geometricTranslocationBindingSampling(State* s){

	if (s->isTerminated()) return 0;
	if (s->NTPbound()) return 0;
	if (s->get_mRNAPosInActiveSite() != 1) return 0;
	

	// Get forward and backward rates
	double kBck = s->calculateBackwardRate(true, true); // Back = from 1 to 0
	s->backward(); 
	double kFwd  = s->calculateForwardRate(true, true); // Forward = from 0 to 1
	s->forward();


	//cout << "kBck " << kBck << " kFwd " << kFwd << endl;



	double kRelease = s->calculateReleaseNTPRate(true);
	double kBind = s->calculateBindNTPrate(true);
	double kcat = kCat->getVal();
	double rateRelCat = kRelease + kcat;
	double rateBindRelease = kBind * kRelease / rateRelCat;
	double rate_bindRelease_or_backforward = rateBindRelease + kBck;
	double rate = kBck + kBind;


	// Keep sampling until it is NOT bind-release or back-forward 
	double runifNum = runif() * rate;
	double totalReactionTime = 0;
	//int n = 0;
	while(runifNum < rate_bindRelease_or_backforward){

		// Bind-release
		if (runifNum < rateBindRelease) {
			totalReactionTime += rexp(rate);  // Time taken to bind
			totalReactionTime += rexp(rateRelCat); // Time taken to release
		}

		// Back-forward
		else{
			totalReactionTime += rexp(rate); // Time taken to go back
			totalReactionTime += rexp(kFwd); // Time taken to come forward again
		}
		//n++;
		runifNum = runif() * rate;
	}

	//cout << n << endl;

	// Bind then catalyse
	double rateBindCat = kBind * kcat / rateRelCat;
	totalReactionTime += rexp(rateBindCat); // Rate bind
	totalReactionTime += rexp(rateRelCat); // Rate cat


	// Actions to do: bind, catalyse
	int actionsToDoList[2] = {3, 3};
	for (int i = 0; i < 2; i ++){
		executeAction(s, actionsToDoList[i]);
	}
	
	return totalReactionTime;


}




// Assumes binding to be kinetic
double Simulator::geometricBindingSampling(State* s){

	if (s->isTerminated()) return 0;
	if (s->NTPbound()) return 0;
	if (s->get_mRNAPosInActiveSite() != 0 && s->get_mRNAPosInActiveSite() != 1) return 0;
	

	double kBck = s->calculateBackwardRate(true, true);
	double kFwd = s->calculateForwardRate(true, true);
	double kRelease = s->calculateReleaseNTPRate(true);
	double kBind = s->calculateBindNTPrate(true);
	double kcat = kCat->getVal();




	bool assumeTranslocationEquilibrium =  	!currentModel->get_assumeBindingEquilibrium()
											&&  currentModel->get_assumeTranslocationEquilibrium() 
											&&  (s->get_mRNAPosInActiveSite() == 0 || s->get_mRNAPosInActiveSite() == 1) && !s->NTPbound();


	if (assumeTranslocationEquilibrium){


		//cout << "XXXX" << endl;

		// Get rate of translocating from 0 to -1
		int currentTranslocationPosition = s->get_mRNAPosInActiveSite();

		if (s->get_mRNAPosInActiveSite() == 1)  s->backward(); 
		double k0_1 = s->calculateForwardRate(true, true);
		double k0_minus1 = s->calculateBackwardRate(true, true);


		// Get rate of translocating from 1 to 2
		s->forward(); 
		double k1_0 = s->calculateBackwardRate(true, true);
		double k1_2 = s->calculateForwardRate(true, true);


		// Move back to original position
		s->set_mRNAPosInActiveSite(currentTranslocationPosition);





		// Percentage of time spent in either state
		double eqConstantFwdTranslocation = k0_1 / k1_0;
		double probabilityPosttranslocated = 1;
		double probabilityPretranslocated = 0;
		if (eqConstantFwdTranslocation != INFINITY){
			probabilityPosttranslocated = eqConstantFwdTranslocation / (eqConstantFwdTranslocation + 1);
			probabilityPretranslocated = 1 - probabilityPosttranslocated;
		}

		//console.log("k0_1", k0_1, "k1_0", k1_0, "probabilityPosttranslocated", probabilityPosttranslocated);


		kFwd = k1_2 * probabilityPosttranslocated; // Can only enter hypertranslocated state from posttranslocated
		//kRelease = kRelease * probabilityPosttranslocated;
		kBind = kBind * probabilityPosttranslocated;
		//kcat = kcat * probabilityPosttranslocated;
		kBck = k0_minus1 * probabilityPretranslocated; // Can only backtrack from pretranslocated


	}
	//cout << "kBind=" << kBind << endl;


	double rateRelCat = kRelease + kcat;
	double rateBindRelease = kBind * kRelease / rateRelCat;
	double rate = kBck + kFwd + kBind; // + kRelease


	//cout << "kBck = " << kBck << " kFwd = " << kFwd << " kRelease = " << kRelease << " kBind = " << kBind << " kcat = " << kcat << " rateRelCat = " << rateRelCat << " rateBindRelease = " << rateBindRelease << " rate = " << rate << endl;


	// Keep sampling until it is NOT bind release
	double runifNum = runif() * rate;
	double totalReactionTime = 0;
	while(runifNum < rateBindRelease){
		totalReactionTime += rexp(rate);  // Time taken to bind
		totalReactionTime += rexp(rateRelCat); // Time taken to release
		runifNum = runif() * rate;
	}


	// Choose next action uniformly
	kRelease = 0;
	double rateBindCat = assumeTranslocationEquilibrium ? kBind : kBind * kcat / rateRelCat;
	double rates[] = { kBck, kFwd, kRelease, rateBindCat };
	int numReactions = (sizeof(rates)/sizeof(*rates));
	double sum = kBck + kFwd + kRelease + rateBindCat;
	runifNum = runif() * sum;
	double cumsum = 0;
	int toDo = -1;
	for (int i = 0; i < (sizeof(rates)/sizeof(*rates)); i ++){
		cumsum += rates[i];
		if (runifNum < cumsum) {
			toDo = i;
			break;
		}

	}
	totalReactionTime += rexp(sum);


	//cout << "rateBindCat = " << rateBindCat << " numReactions = " << numReactions << " sum = " << sum << " toDo = " << toDo << endl;



	// If next action is bindcat then add the time for catalysis
	int actionsToDoList[3] = {toDo, -2, -2};

	if (!assumeTranslocationEquilibrium && toDo == 3) {
		totalReactionTime += rexp(rateRelCat);
		actionsToDoList[0] = 3;
		actionsToDoList[1] = 3;
	}


	else if(assumeTranslocationEquilibrium){


		if (toDo == 3) {
			totalReactionTime += rexp(rateRelCat);
			if (s->get_mRNAPosInActiveSite() == 0) {

				// Need to be in posttranslocated state before binding 
				actionsToDoList[0] = 1;
				actionsToDoList[1] = 3;
				actionsToDoList[2] = 3;
			}
			else if (s->get_mRNAPosInActiveSite() == 1) {

				// Need to be in posttranslocated state before binding 
				actionsToDoList[0] = 3;
				actionsToDoList[1] = 3;

			}
		}

		else if (toDo == 1 && s->get_mRNAPosInActiveSite() == 0) {

			// Need to be in posttranslocated state before moving forward 
			actionsToDoList[0] = 1;
			actionsToDoList[1] = 1;

		}
		else if (toDo == 0 && s->get_mRNAPosInActiveSite() == 1) {

			// Need to be in pretranslocated state before moving backwards 
			actionsToDoList[0] = 0;
			actionsToDoList[1] = 0;
		}

	}





	
	
	for (int i = 0; i < 3; i ++){
		if (actionsToDoList[i] == -2) break;
		executeAction(s, actionsToDoList[i]);
	}

	
	return totalReactionTime;

}


void Simulator::executeAction(State* s, int reactionToDo) {

	switch (reactionToDo) {
		case -1:
			cout << "Error: sampled action -1" << endl;
			exit(0);
			break;
		case 0:
			//s->releaseNTP();
			s->backward();
			break;
		case 1:
			s->forward();
			break;
		case 2:
			//s->backward();
			s->releaseNTP();
			break;
		case 3:
			s->bindNTP();
			break;
	}

}
