

#ifndef BAYES_CLASSIFIER_H
#define BAYES_CLASSIFIER_H



#include "Sequence.h"

#include <string>
#include <vector>
#include <list>

using namespace std;


class BayesClassifier {

    
	int window_before;
	int window_after;
	double prior;
	double threshold;
	vector<vector<double>> likelihoods_positive;
	vector<vector<double>> likelihoods_negative;

    	public:

  		BayesClassifier();
        void loadFromFile(string inputProbabilitiesFile);
        void loadFromString(string inputProbabilities);
		vector<double> get_evidence_per_site(Sequence* seq, double minEvidence, double maxEvidence);
		vector<double> get_min_max_evidence();
        double get_threshold();



};
#endif