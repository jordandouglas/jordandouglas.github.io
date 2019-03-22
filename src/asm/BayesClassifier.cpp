

#include "Settings.h"
#include "BayesClassifier.h"



#include <iostream>
#include <string> 
#include <fstream>
#include <vector>
#include <math.h>  



using namespace std;







BayesClassifier::BayesClassifier(){
	this->threshold = 0;
    this->window_after = 0;
    this->window_before = 0;
    this->prior = 0;

    	
}


// Load the Naive Bayes classifier from the specified file
void BayesClassifier::loadFromFile(string inputProbabilitiesFile){

    cout << "Parsing Bayes classifier parameters from " << inputProbabilitiesFile << endl;
    
    
    // Parse the parameters file
    ifstream NBC_file;
    string line = "";
    NBC_file.open(inputProbabilitiesFile);
    vector<string> split_line;
    string inputProbabilitiesString = "";
    if(NBC_file.is_open()) {
        while(getline(NBC_file, line)) inputProbabilitiesString += line + "|";
        NBC_file.close();
    }

    else {
        cout << "Cannot parse file " << inputProbabilitiesFile << endl;
        exit(0);
    }
    
    
    this->loadFromString(inputProbabilitiesString);

    cout << "NBC parameters successfully parsed." << endl;


}


// Load the Naive Bayes classifier from the string of an input file. Lines are separated by '|' for ease of parsing from JavaScript
void BayesClassifier::loadFromString(string inputProbabilities){


    //cout << "Parsing NBC: " << inputProbabilities << endl;

    vector<string> splitInput = Settings::split(inputProbabilities, '|');
    vector<string> split_line ;
    

    // First line
    string line = splitInput.at(0);
    split_line = Settings::split(line, ',');
    for (int i = 0; i < split_line.size(); i ++){
        vector<string> split_param = Settings::split(split_line.at(i), '=');
        if (split_param.size() == 2){
            string param = split_param.at(0);
            if (param == "prior") this->prior = stof(split_param.at(1));
            else if (param == "threshold") this->threshold = stof(split_param.at(1));
            else if (param == "window_before") this->window_before = stoi(split_param.at(1));
            else if (param == "window_after") this->window_after = stoi(split_param.at(1));

        }

    }


    //cout << "Prior = " << this->prior << ", window_before = " << this->window_before << ", window_after = " << this->window_after << " threshold  = " << this->threshold << endl;
    this->likelihoods_positive.resize(this->window_before + 1 + this->window_after);
    for (int i = 0; i < this->likelihoods_positive.size(); i ++){
        this->likelihoods_positive.at(i).resize(4); // A, C, G, T
    }


    this->likelihoods_negative.resize(this->window_before + 1 + this->window_after);
    for (int i = 0; i < this->likelihoods_negative.size(); i ++){
        this->likelihoods_negative.at(i).resize(4); // A, C, G, T
    }



    // Positive likelihoods
    int lineNum = 2;
    for (lineNum = 2; lineNum < splitInput.size(); lineNum ++) {
            
        string line = splitInput.at(lineNum);
        if (line == "Class0") break;
        
        
        split_line = Settings::split(line, ';');
        if (split_line.size() != 2) continue;

        string nucleotide = split_line.at(0);
        int rowNum = nucleotide == "A" ? 0 : nucleotide == "C" ? 1 : nucleotide == "G" ? 2 : 3;


        split_line = Settings::split(split_line.at(1), ',');
        if (split_line.size() != this->likelihoods_positive.size()){
            cout << "Error parsing file" << endl;
            exit(0);
        }


        for (int i = 0; i < this-> likelihoods_positive.size(); i ++){
            double likelihood = stof(split_line.at(i));
            this->likelihoods_positive.at(i).at(rowNum) = likelihood;
        }


    }
    
    
    // Negative likelihoods on the remaining lines
    for (lineNum = lineNum + 1; lineNum < splitInput.size(); lineNum ++) {

        string line = splitInput.at(lineNum);


        split_line = Settings::split(line, ';');
        if (split_line.size() != 2) continue;

        string nucleotide = split_line.at(0);
        int rowNum = nucleotide == "A" ? 0 : nucleotide == "C" ? 1 : nucleotide == "G" ? 2 : 3;


        split_line = Settings::split(split_line.at(1), ',');
        if (split_line.size() != this->likelihoods_negative.size()){
            cout << "Error parsing file" << endl;
            exit(0);
        }


        for (int i = 0; i < this-> likelihoods_negative.size(); i ++){
            double likelihood = stof(split_line.at(i));
            this->likelihoods_negative.at(i).at(rowNum) = likelihood;
        }
        
    }
    

}




// Computes the evidence of each sequence in the alignment being a pause site. Normalises into []0,1]
vector<double> BayesClassifier::get_evidence_per_site(Sequence* seq, double minEvidence, double maxEvidence){



	string sequence = seq->get_complementSequence();
    vector<double> evidence(sequence.size() + 1);
    for (int i = 0; i < evidence.size(); i ++) evidence.at(i) = 0;
    
	if (sequence.size() < this->window_after + 1 + this->window_before){

		cout << "Cannot process sequence because it is shorter than the window size of " << this->window_after + 1 + this->window_before << endl;
		return evidence;

	}


	// Convert sequence into a vector of integers
	vector<int> seq_int(sequence.size());
	for (int i = 0; i < sequence.size(); i ++){
		string nucleotide = sequence.substr(i, 1);
		int num = nucleotide == "A" ? 0 : nucleotide == "C" ? 1 : nucleotide == "G" ? 2 : 3;
		seq_int.at(i) = num;
	}


	double log_posterior_positive;
	double log_posterior_negative;
	list<int> pauseSites;
	for (int site = this->window_before + 1; site < sequence.size() - this->window_after; site ++) {
		log_posterior_positive = log(this->prior);
		log_posterior_negative = log(1 - this->prior);
		int window_start = site - this->window_before;
		for (int windowPos = 0; windowPos < this->window_after + 1 + this->window_before; windowPos ++){
			int windowSiteNum = windowPos + window_start;
			int rowNum = seq_int.at(windowSiteNum-1);

			log_posterior_positive += log(this->likelihoods_positive.at(windowPos).at(rowNum));
			log_posterior_negative += log(this->likelihoods_negative.at(windowPos).at(rowNum));

		}

		double score = log_posterior_positive - log_posterior_negative;
        double normalisedScore = (score - minEvidence) / (maxEvidence - minEvidence);
		evidence.at(site + 1) = normalisedScore;
		
	}

	return evidence;

}




// Return the maximum and minimum possible probability that a sequence can be a pause
vector<double> BayesClassifier::get_min_max_evidence() {


    // Find the two sequences which have the maximum and the minimum evidence
    double max_score_positive = log(this->prior);
    double max_score_negative = log(1 - this->prior);
    double min_score_positive = log(this->prior);
    double min_score_negative = log(1 - this->prior);
    for (int pos = 0; pos < this->window_before + this->window_after + 1; pos ++){
    
        // Take maximum and minimum probability across the four nucleotides for this site 
        double log_max_evidence_site = -INF;
        double log_min_evidence_site = INF;
        int max_nt;
        int min_nt;
        for (int nt = 0; nt < 4; nt ++ ){
            double likelihood_1 = this->likelihoods_positive.at(pos).at(nt);
            double likelihood_0 = this->likelihoods_negative.at(pos).at(nt);
            
            // Log likelihood ratio
            double contributionToEvidence = log(likelihood_1) - log(likelihood_0);
            //cout << "Site " << pos << " nt " << nt << " contributes " << contributionToEvidence << endl;
            
            if (contributionToEvidence > log_max_evidence_site) {
                log_max_evidence_site = contributionToEvidence;
                max_nt = nt;
            }
            
            if (contributionToEvidence < log_min_evidence_site) {
                log_min_evidence_site = contributionToEvidence;
                min_nt = nt;
            }
            
        }
        
        // Update the contribution of the best/worst nucleotide at this site to the total score
        max_score_positive += log(this->likelihoods_positive.at(pos).at(max_nt));
        max_score_negative += log(this->likelihoods_negative.at(pos).at(max_nt));
        min_score_positive += log(this->likelihoods_positive.at(pos).at(min_nt));
        min_score_negative += log(this->likelihoods_negative.at(pos).at(min_nt));
        
    }
        
    
    
    // Calculate the evidence of the best and worst sequences
    vector<double> min_max(2);
    min_max.at(0) = min_score_positive - min_score_negative;
    min_max.at(1) = max_score_positive - max_score_negative;
    //cout << "The minimum evidence is " << min_max.at(0) << endl;
    //cout << "The maximum evidence is " << min_max.at(1) << endl;
    
    return min_max;

}





// Returns the evidence threshold required to classify a site as a pause
double BayesClassifier::get_threshold() {
    return this->threshold;
}