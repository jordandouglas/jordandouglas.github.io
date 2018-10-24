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
#include "EvolutionSimulator.h"
#include "randomc/randomc.h"
#include "SimulatorPthread.h"
#include "Plots.h"
#include "PauseSiteUtil.h"


#include <random>
#include <string>


using namespace std;







// Simulate "nLineages" lineages from a single sequence "seq" over "nGenerations". At each generation the pause time will be recorded and printed to a file
void EvolutionSimulator::simulateEvolution(Sequence* seq, int pauseSite, int nGenerations, int nLineages, double transitionTransversionRatio, string outputFile){


    // RNG
    random_device rd; 
    CRandomMersenne* sfmt = new CRandomMersenne(rd());
    double runif_num;


    vector<vector<double>> pauseTimesThisLineage;
    vector<double> pauseTimesThisSequence;
    pauseTimesThisLineage.resize(nGenerations + 1);
    

    for (int lineage = 0; lineage < nLineages; lineage ++){


        string id = seq->getID() + "|" + to_string(lineage+1);
        cout << "Simulating lineage " << id << endl;
        

        // Get pause times of initial sequence
        Sequence* sequence_lineage = new Sequence(id, "dsDNA", "ssRNA", seq->get_templateSequence());
        pauseTimesThisSequence = EvolutionSimulator::getPauseTime(sequence_lineage, pauseSite);
        pauseTimesThisLineage.at(0).clear();
        pauseTimesThisLineage.at(0) = pauseTimesThisSequence;


        // Iterate through generations
        for (int mut = 1; mut <= nGenerations; mut ++){



            // Add a single mutation
            int siteToMutate = floor(sfmt->Random() * sequence_lineage->get_templateSequence().size());
            string currentNucleotide = sequence_lineage->get_templateSequence().substr(siteToMutate, 1);

           
            string newNucleotide = "";
            runif_num = sfmt->Random() * (transitionTransversionRatio + 2);
            if (currentNucleotide == "A") newNucleotide = runif_num < transitionTransversionRatio ? "G" : runif_num < transitionTransversionRatio + 1 ? "C" : "T";
            else if (currentNucleotide == "C") newNucleotide = runif_num < transitionTransversionRatio ? "T" : runif_num < transitionTransversionRatio + 1 ? "A" : "G";
            else if (currentNucleotide == "G") newNucleotide = runif_num < transitionTransversionRatio ? "A" : runif_num < transitionTransversionRatio + 1 ? "C" : "T";
            else if (currentNucleotide == "T") newNucleotide = runif_num < transitionTransversionRatio ? "C" : runif_num < transitionTransversionRatio + 1 ? "A" : "G";



            string sequence_lineage_seq = sequence_lineage->get_templateSequence().substr(0, siteToMutate) + newNucleotide + sequence_lineage->get_templateSequence().substr(siteToMutate+1);




            // Create this generations sequence object
            sequence_lineage->clear();
            delete sequence_lineage;
            sequence_lineage = new Sequence(id, "dsDNA", "ssRNA", sequence_lineage_seq);



            // Reevaluate pause times
            pauseTimesThisSequence = EvolutionSimulator::getPauseTime(sequence_lineage, pauseSite);
            pauseTimesThisLineage.at(mut).clear();
            pauseTimesThisLineage.at(mut) = pauseTimesThisSequence;


        }



        PauseSiteUtil::writePauseSitesToFile(outputFile, sequence_lineage, pauseTimesThisLineage);


    }



    
}





// Randomly generates sequences of specified length. Any sequence which has a pause site (at specified position with median duration
// above specified threshold) is save to a fasta file
void EvolutionSimulator::generateSequencesWithPauseSite(double pauseThreshold, int seqLen, int pauseSite, int nattempts, string outputFile){


    double medianPauseDuration = 0;
    double runif_num = 0;

    // RNG
    random_device rd; 
    mt19937 generator{rd()};
    CRandomMersenne* sfmt = new CRandomMersenne(rd());
    poisson_distribution<> poisson{1}; // Poisson distribution with mean of 1

    //cout <<  poisson(generator) << poisson(generator) << poisson(generator) << poisson(generator) << endl;

    // 1. Generate a random sequence of length seqLen and compute their fitnesses
    int nsuccesses = 0;
    for (int n = 0; n < nattempts; n ++){


        if (n == 0 || (n+1) % 100 == 0) cout << "Testing random sequence number " << n+1 << endl;

        string randomSequence = "";
        for (int i = 0; i < seqLen; i ++){
            runif_num = sfmt->Random();
            if (runif_num < 0.25) randomSequence += "A";
            else if (runif_num < 0.5) randomSequence += "C";
            else if (runif_num < 0.75) randomSequence += "G";
            else randomSequence += "T";
        }

        // Compute fitness, print median and standard error to file

        Sequence* this_seq = new Sequence("", "dsDNA", "ssRNA", randomSequence);
        vector<double> pauseTimes = EvolutionSimulator::getPauseTime(this_seq, pauseSite);
        medianPauseDuration = pauseTimes.at(2);
        //PauseSiteUtil::writePauseSiteToFile(outputFile, -nGenerationsOfSelection, pauseTimes.at(2), pauseTimes.at(3));





        if (medianPauseDuration >= pauseThreshold){

            nsuccesses ++;
            cout << randomSequence << ": " << medianPauseDuration << "s" << endl;
            cout << "N successes: " << nsuccesses << endl;
            this_seq->setID("seq" + to_string(nsuccesses) + "_" + to_string(medianPauseDuration) + "(" + to_string(pauseTimes.at(3)) + ")");
            
            PauseSiteUtil::writeSequenceToFile(outputFile, this_seq);

        }


        else if (medianPauseDuration >= 0.5 * pauseThreshold) cout << "Sequence came close " << ": " << medianPauseDuration << "s" << endl;
        



        this_seq->clear();
        delete this_seq;



    }

    /*
    // 2. Iterate: Apply a mutation, and sample between parent and offspring from their log median pause times at the pause site
    for (int generation = 1; generation < nGenerationsOfSelection; generation ++){


        // Mutate 1 or more nucleotides
        double nmuts = poisson(generator) + 1;
        string proposal_seq = this_seq->get_templateSequence();
        for (int mut = 0; mut < nmuts; mut ++){
            double siteToMutate = floor(sfmt->Random() * seqLen);
            string currentNucleotide = proposal_seq.substr(siteToMutate, 1);
            string newNucleotide = "";
            runif_num = sfmt->Random() * (transitionTransversionRatio + 2);
            if (currentNucleotide == "A") newNucleotide = runif_num < transitionTransversionRatio ? "G" : runif_num < transitionTransversionRatio + 1 ? "C" : "T";
            else if (currentNucleotide == "C") newNucleotide = runif_num < transitionTransversionRatio ? "T" : runif_num < transitionTransversionRatio + 1 ? "A" : "G";
            else if (currentNucleotide == "G") newNucleotide = runif_num < transitionTransversionRatio ? "A" : runif_num < transitionTransversionRatio + 1 ? "C" : "T";
            else if (currentNucleotide == "T") newNucleotide = runif_num < transitionTransversionRatio ? "C" : runif_num < transitionTransversionRatio + 1 ? "A" : "G";
            proposal_seq = proposal_seq.substr(0, siteToMutate) + newNucleotide + proposal_seq.substr(siteToMutate+1);
        }

        // Compute (and print?) fitness
        pauseTimes = EvolutionSimulator::getPauseTime(this_seq, pauseSite);
        fitness_proposalSeq = pow(pauseTimes.at(2), 2);
        PauseSiteUtil::writePauseSiteToFile(outputFile, -nGenerationsOfSelection + generation, pauseTimes.at(2), pauseTimes.at(3));
        cout << proposal_seq << endl;


        // Sample between fitnesses using the Metropolis ratio
        runif_num = sfmt->Random();


        // Accept
        if (runif_num < fitness_proposalSeq / fitness_thisSeq){


            cout << "Accept " << sqrt(fitness_proposalSeq) << " over " << sqrt(fitness_thisSeq) << endl;

            this_seq->clear();
            delete this_seq;
            this_seq = new Sequence("", "dsDNA", "ssRNA", proposal_seq);
            fitness_thisSeq = fitness_proposalSeq;

        }


        // Reject
        else {

            cout << "Reject " << sqrt(fitness_proposalSeq) << " for " << sqrt(fitness_thisSeq) << endl;

        }

      



    }
   
   */


    // 3: Iterate: Apply a mutation and compute log median pause time. No selection.




    
}


// Returns a vector containing the mean, SE, median, SE pause time of the site in this sequence
vector<double> EvolutionSimulator::getPauseTime(Sequence* seq, int pauseSite){

    // Activate the sequence and calculate fitness
    _GUI_PLOTS->deletePlotData(_currentStateGUI, true, true, true, true, true, true);
    Settings::setSequence(seq);
    _GUI_PLOTS->init(); 
    SimulatorPthread::performNSimulations(ntrials_sim, false);
    vector<vector<double>> timeToCatalysisPerSite = _GUI_PLOTS->getTimeToCatalysisPerSite();

    return timeToCatalysisPerSite.at(pauseSite - 1);

}
