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



// 											[templateType, primerType, editSite, sequence, smallest insert size, edit distn]
all_sequences = {};


all_sequences["E.coli lacZ gene GU063697"] = {template: "dsDNA", primer: "ssRNA", editSite: -1, seq: "TACTTTCGACCGATGTCCTTCCGGTCTGCGCTTAATAAAAACTACCGCAATTGAGCCGCAAAGTAGACACCACGTTGCCCGCGACCCAGCCAATGCCGGTCCTGTCAGCAAACGGCAGACTTAAACTGGACTCGCGTAAAAATGCGCGGCCTCTTTTGGCGGAGCGCCACTACCACGACGCGACCTCACTGCCGTCAATAGACCTTCTAGTCCTATACACCGCCTACTCGCCGTAAAAGGCACTGCAGAGCAACGACGTATTTGGCTGATGTGTTTAGTCGCTAAAGGTACAACGGTGAGCGAAATTACTACTAAAGTCGGCGCGACATGACCTCCGACTTCAAGTCTACACGCCGCTCAACGCACTGATGGATGCCCATTGTCAAAGAAATACCGTCCCACTTTGCGTCCAGCGGTCGCCGTGGCGCGGAAAGCCGCCACTTTAATAGCTACTCGCACCACCAATACGGCTAGCGCAGTGTGATGCAGACTTGCAGCTTTTGGGCTTTGACACCTC", minInsertSize: 0, insertDistn:[], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};



all_sequences["Buchnera aphidicola murC1 EU274658"] = {template: "dsDNA", primer: "ssRNA", editSite: 40, seq: "GGAAGACTATTAGGTCTTTAATATCGTCGATTTTTTTTTTGTAAGGATATGATAATTCTCGACTTTA", minInsertSize: -1, insertDistn:[5, 7, 11], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};



//all_sequences["Sendai virus P edit site"] = {template: "ssRNA", primer: "ssRNA", editSite: 32, seq: "GGGUCCAGGUCUCUGGCUGCGUUGUUUUUUCCCGUAUCCUCUCUUGUGUAGUAGAUACUUU", minInsertSize: 0, insertDistn: [ 0.74, 0.2, 0.03, 0.01, 0.01, 0.01 ], hybridLength: 7};
//all_sequences["Atlantic salmon paramyxovirus P edit site"] = {template: "ssRNA",  primer: "ssRNA", editSite: 32, seq: "CUCCUUCUUCGUGCUGUCCAACCAUUUUUUCCGUAUCUGCUCUCUAGACGUAGAUGUGGAU", minInsertSize: 0, insertDistn:[ 23, 46, 3, 1, 1, 1 ], hybridLength: 7};
all_sequences["Mumps virus P edit site"] = {template: "ssRNA", primer:  "ssRNA", editSite: 32, seq: "CCTGGAGTTGCGGCCACTGTCTTAAATTCTCCCCCCGGCCCTCGCCGACGAGTTCCGGTCT", minInsertSize: 0, insertDistn:[ 34, 0, 10, 7, 1, 2 ],  hybridLength: 7};
//all_sequences["Nipah virus P edit site"] = {template: "ssRNA", primer: "ssRNA", editSite: 32,  seq: "CGGUUUCAGGGCUCCAUAAGGGUAAUUUUUCCCGUGUCUGCGCUUUAUAGGUAGACGACCC", minInsertSize: 0, insertDistn:[ 77, 26, 17, 18, 16, 30, 11, 12, 1, 1, 1, 1, 0, 0, 1 ], hybridLength: 7};
//all_sequences["Hendra virus P edit site"] = {template: "ssRNA", primer: "ssRNA", editSite: 32, seq: "CGGATTTAGTTCCTAGTACGGGTAATTTTTCCCGTGTCTGCGCTTCAGAGTTATACAACCC", minInsertSize: 0, insertDistn:[29, 16, 10, 10, 2, 3, 9, 4, 7, 4, 5, 1, 0, 0, 0, 3],hybridLength: 7};
//all_sequences["Anaconda paramyxovirus P edit site"] = {template: "ssRNA", primer: "ssRNA", editSite: 35, seq: "TAGTGTTTCTACTCTCGTTCGAGCCTCATTCCCCCCGAGGATCGCTTCCCTCCTCTAGGTT", minInsertSize: 0, insertDistn:[31, 2, 4], hybridLength: 7};
//all_sequences["Fer-de-lance virus P edit site"] = {template: "ssRNA", primer: "ssRNA", editSite: 35, seq: "TGGTATTTCTACTCTTGTTCAATCCTTATTCCCCCCGAAGATCGCTTCCCTCTTCTGGGTC", minInsertSize: 0, insertDistn:[24, 2, 10, 1],hybridLength: 7};
//all_sequences["Zaire Ebolavirus edit site"] = {template: "ssRNA",primer:  "ssRNA", editSite: 37, seq: "UGUUAGCCCCUCACCCGGAAGACCCUUUGAUUUUUUUGGAGUGAUCUUUUU", minInsertSize: 0, insertDistn:[150, 52, 4, 3, 1, 4, 0, 2, 1, 2, 1, 2, 0, 0, 0, 1, 0 ,1 ], hybridLength: 7};
//all_sequences["Turnip mosaic virus edit site"] = {template: "ssRNA",primer:  "ssRNA", editSite: -1, seq: "CTCCCTAGTATCGTAGAGGTAAAACCTTTTTTCAATAGATGTTTAGAA", minInsertSize: -1, insertDistn:[0.002, 0.97, 0.02]};
//all_sequences["Hepatitis C Virus 1 edit site"] = {template: "dsRNA", primer: "dsRNA", editSite: -1, seq: "UUAGGAUUUGGAGUUUUUUUUUUGUUUGCAUUGUGGUUGGC", minInsertSize: -3, insertDistn:[1, 0, 3, 15, 6, 1, 1]};
all_sequences["Human Huntingtin poly(Q) region"] = {template: "ssDNA", hybridLength: 9, primer: "dsDNA", editSite: -1, seq: "CAGGAAGGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTTGTCGGCGG", minInsertSize: 0, insertDistn:[]};
all_sequences["AAGG microsatellite"] = {template: "ssDNA", primer: "dsDNA", hybridLength: 9, editSite: -1, seq: "AAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGGAAGG", minInsertSize: 0, insertDistn:[]};
all_sequences["Haemoglobin subunit &beta;"] = {template: "dsDNA", primer: "ssRNA", hybridLength: 9, editSite: -1, seq: "TGTAAACGAAGACTGTGTTGACACAAGTGATCGTTGGAGTTTGTCTGTGGTACCACGTAGACTGAGGACTCCTCTTCAGACGGCAATGACGGGACACCCCGTTCCACTTGCACCTACTTCAACCACCACTCCGGGACCCGTCCGACGACCACCAGATGGGAACCTGGGTCTCCAAGAAACTCAGGAAACCCCTAGACAGGTGAGGACTACGACAATACCCGTTGGGATTCCACTTCCGAGTACCGTTCTTTCACGAGCCACGGAAATCACTACCGGACCGAGTGGACCTGTTGGAGTTCCCGTGGAAACGGTGTGACTCACTCGACGTGACACTGTTCGACGTGCACCTAGGACTCTTGAAGTCCGAGGACCCGTTGCACGACCAGACACACGACCGGGTAGTGAAACCGTTTCTTAAGTGGGGTGGTCACGTCCGACGGATAGTCTTTCACCACCGACCACACCGATTACGGGACCGGGTGTTCATAGTGATTCGAGCGAAAGAACGACAGGTTAAAGATAATTTCCAAGGAAACAAGGGATTCAGGTTGATGATTTGACCCCCTATAATACTTCCCGGAACTCGTAGACCTAAGACGGATTATTTTTTGTAAATAAAAGTAACG", minInsertSize: 0, insertDistn:[]};
//all_sequences["LacZ&alpha; / HIV-1 reverse transcriptase"] = {template: "ssDNA", primer: "ssDNA", hybridLength: 9, editSite: -1, seq: "CGCGTTGCGTTAATTACACTCAATCGAGTGAGTAATCCGTGGGGTCCGAAATGTGAAATACGAAGGCCGAGCATACAACACACCTTAACACTCGCCTATTGTTAAAGTGTGTCCTTTGTCGATACTGGTACTAATGCTTAAGTGACCGGCAGCAAAATGTTGCAGCACTGACCCTTTTGGGACCGCAATGGGTTGAATTAGCGGAACGTCGTGTAGGGGGAAAGCGGTCGACCGCATTATCGCTTCTCCGGGCGTGG", minInsertSize: 0, insertDistn:[]};






//all_sequences["T. thermophilus dnaX gene AF025391"] = {template: "dsDNA", primer: "ssRNA", editSite: -1, seq: "CAGCAAGAGCAGGACCTCCCTCTTTTTTTTTCGGACTCGGG", minInsertSize: -2, insertDistn:[1, 0, 15, 5, 2, 0, 0, 1, 0, 0, 1], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};


//all_sequences["Buchnera aphidicola murE EU274658 (no slippage)"] = {template: "dsDNA", primer: "ssRNA", editSite: -1, seq: "AACTATAAGTTAGTAAAAATATGTAGCGGAATTTTTTTTTTAATTAAATCAATGGTACCTTCAAAGTA", minInsertSize: -1, insertDistn:[], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};
//all_sequences["Buchnera aphidicola murE EU274658 (slippage)"] = {template: "dsDNA", primer: "ssRNA", editSite: 38, seq: "TAATTTACGTTAGTTTAGTATAAAAAAATTTTTTTTTTATACCACATATAAACCTACACCTCC", minInsertSize: -1, insertDistn:[2, 42, 21, 5, 0, 1, 1], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};

all_sequences["Buchnera aphidicola murF  EU274658"] = {template: "dsDNA", primer: "ssRNA", editSite: 36, seq: "ATTTTTATAAAAAATAAAAAGATAACTTTTTTTTTTCTTTCACTAAAAAAAAGAT", minInsertSize: -1, insertDistn:[3, 9, 7], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};


all_sequences["Buchnera aphidicola murC2 EU274658"] = {template: "dsDNA", primer: "ssRNA", editSite: 43, seq: "TACGCTAAAATATTCGTTAAAGTGTAATTAATCTTTTTTTTTTAATTTATTGGATTTTTAATG", minInsertSize: -1, insertDistn:[7, 43, 5, 4, 2], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};

all_sequences["Buchnera aphidicola murC3 EU274658"] = {template: "dsDNA", primer: "ssRNA", editSite: 34, seq: "ACTTATGTAACCTTTTAATAAATATTTTTTTTTTAGGTAAGTTTTACTTTCACAATACAAT", minInsertSize: -2, insertDistn:[1, 8, 52, 2], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};


//all_sequences["rpoB sequence with pause sites"] = {template: "dsDNA", primer: "ssRNA", editSite: -1, seq: "GAUCCGCCCGCAUAUCUCGGGUGAAACCGCAUCUUUUGACAUCGAAGCUAACGGUAAAGUGUACGUAGAAAAAGGCCGCCGUAUCACUGCGCGCCACAUUCGCGGAAACACCACCAUCAUCACCAUCAUCCUGACUAGUCUUUCAGGCGAUGUGUGCUGGAAGACAUUCAGAUCGACCUGUUCUUUGAAAAAGUUAUCUUUGAAAUCCGUGAUAACAAGCUGCAGAUGGAACUCGGGUA", minInsertSize: 0, insertDistn:[], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};



all_sequences["E.coli rpoB KP670789"] = {template: "dsDNA", primer: "ssRNA", editSite: -1, seq: "TACCAAATGAGGATATGGCTCTTTTTTGCATAAGCATTCCTAAAACCATTTGCAGGTGTTCAAGACCTACATGGAATAGAGGAAAGATAGGTCGAACTGAGCAAAGTCTTTAAATAGCTCGTTCTAGGACTTCCCGTCATACCAGACCTTCGACGAAAGGCAAGGCATAAGGGCTAAGTCTCGATGTCGCCATTAAGGCTCGACGTTATGCAGTCGATGGCGGAACCGCTTGGCCACAAACTGCAGGTCCTTACAGTTTAGGCACCGCACTGGATAAGGCGTGGCGACGCGCAATTTGACGCAGACCACTAGATACTCGCGCTTCGCGGCCTTCCGTGGCATTTTCTGTAATTTCTTGTTCTTCAGATGTACCCGCTTTAAGGCGAGTACTGTCTGTTGCCATGGAAACAATAGTTGCCATGACTCGCACAATAGCAAAGGGTCGACGTGGCATCAGGCCCGCAGAAGAAACTGAGGCTGTTTCCATTTTGGGTGAGAAGCCCATTTCACGACATATTGCGCGCATAGTAGGGAATGGCACCAAGGACCGACCTGAAGCTTAAGCTAGGCTTCCTGTTGGACAAGCATGCATAGCTGGCAGCGGCATTTGACGGACGCTGGTAGTAAGACGCGCGGGACTTGATGTGGTGTCTCGTCTAGGAGCTGGACAAGAAACTTTTTCAATAGAAACTTTAGGCACTATTGTTCGACGTCTACCTTGACCACGGCCTTGCGGACGCACCACTTTGGCGTAGAAAACTGTAGCTTCGATTGCCATTTCACATGCATCTTTTTCCGGCGGCATAGTGACGCGCGGTGTAAGCGGTCGACCTTTTTCTGCTGCAGTTTGACTAGCTTCAGGGCCAACTCATGTAGCGTCCATTTCACCAACGATTTCTGATATAACTACTCAGATGGCCGCTCGACTAGACGCGTCGCTTGTACCTCGACTCGGACCTAGACGACCGATTCGACTCGGTCAGACCAGTGTTCGCATAGCTTTGCGACAAGTGGTTGCTAGACCTAGTGCCGGGTATATAGAGACTTTGGAATGCACAGCTGGGTTGATTGCTGGCAGACTCGCGTGACCATCTTTAGATGGCGTACTACGCGGGACCGCTCGGCGGCTGAGCACTTCGTCGACTTTCGGACAAGCTCTTGGACAAGAAGAGGCTTCTGGCAATACTGAACAGACGCCAACCAGCATACTTCAAGTTGGCAAGAGACGACGCGCTTCTTTAGCTTCCAAGGCCATAGGACTCGTTTCTGCTGTAGTAACTACAATACTTTTTCGAGTAGCTATAGGCATTGCCATTTCCGCTTCAGCTACTATAGCTGGTGGAGCCGTTGGCAGCATAGGCAAGGCAACCGCTTTACCGCCTTTTGGTCAAGGCGCAACCGGACCATGCACATCTCGCACGCCACTTTCTCGCAGACAGAGACCCGCTAGACCTATGGGACTACGGTGTCCTATACTAGTTGCGGTTCGGCTAAAGGCGTCGTCACTTTCTCAAGAAGCCAAGGTCGGTCGACAGAGTCAAATACCTGGTCTTGTTGGGCGACAGACTCTAATGCGTGTTTGCAGCATAGAGGCGTGAGCCGGGTCCGCCAGACTGGGCACTTGCACGTCCGAAGCTTCAAGCTCTGCATGTGGGCTGAGTGATGCCAGCGCATACAGGTTAGCTTTGGGGACTTCCAGGCTTGTAGCCAGACTAGTTGAGAGACAGGCACATGCGTGTCTGATTGCTTATGCCGAAGGAACTCTGAGGCATAGCATTTCACTGGCTGCCACAACATTGACTGCTTTAAGTGATGGACAGACGATAGCTTCTTCCGTTGATGCAATAGCGGGTCCGCTTGAGGTTGAACCTACTTCTTCCGGTGAAGCATCTTCTGGACCATTGAACGGCATCGTTTCCGCTTAGGTCGAACAAGTCGGCGCTGGTCCAACTGATGTACCTGCATAGGTGGGTCGTCCACCATAGGCAGCCACGCAGGGACTAGGGCAAGGACCTTGTGCTACTGCGGTTGGCACGTAACTACCCACGCTTGTACGTTGCAGTCCGGCAAGGCTGAGACGCGCGACTATTCGGCGACCAACCATGACCATACCTTGCACGACAACGGCAACTGAGGCCACATTGACGCCATCGATTTGCACCACCACAGCAAGTCATGCACCTACGAAGGGCATAGCAATAGTTTCAATTGCTTCTGCTCTACATAGGCCCACTTCGTCCATAGCTGTAGATGTTGGACTGGTTTATGTGGGCAAGATTGGTCTTGTGGACATAGTTGGTCTACGGCACACACAGAGACCCACTTGGCCAACTTGCACCGCTGCACGACCGTCTGCCAGGCAGGTGGCTGGAGCCACTTGACCGCGAACCAGTCTTGTACGCGCATCGCAAGTACGGCACCTTACCAATGTTGAAGCTTCTGAGGTAGGAGCATAGGCTCGCACAACAAGTCCTTCTGGCAAAGTGGTGGTAGGTGTAAGTCCTTGACCGCACACACAGGGCACTGTGGTTCGACCCAGGCCTTCTCTAGTGGCGACTGTAGGGCTTGCACCCACTTCGACGCGAGAGGTTTGACCTACTTAGGCCATAGCAAATGTAACCACGCCTTCACTGGCCACCGCTGTAAGACCAACCATTCCATTGCGGCTTTCCACTTTGAGTCGACTGGGGTCTTCTTTTTGACGACGCACGCTAGAAGCCACTCTTTCGGAGACTGCAATTTCTGAGAAGAGACGCGCATGGTTTGCCACATAGGCCATGCCAATAGCTGCAAGTCCAGAAATGAGCGCTACCGCATCTTTTTCTGTTTGCACGCGACCTTTAGCTTCTTTACGTCGAGTTTGTCCGCTTCTTTCTGGACAGACTTCTTGACGTCTAGGAGCTTCGCCCAGACAAGTCGGCATAGGCACGACACGACCATCGGCCACCGCAACTTCGACTCTTCGAGCTGTTTGACGGCGCGCTAGCGACCGACCTCGACCCGGACTGTCTGCTTCTCTTTGTTTTAGTCGACCTTGTCGACCGACTCGTCATACTGCTTGACTTTGTGCTCAAGCTCTTCTTTGAGCTTCGCTTTGCGGCGTTTTAGTGGGTCCCGCTGCTAGACCGTGGCCCGCACGACTTCTAACAATTCCATATAGACCGCCAATTTGCGGCATAGGTCGGACCACTGTTCTACCGTCCAGCAGTGCCATTGTTCCCACATTAAAGATTCTAGTTGGGCTAGCTTCTATACGGAATGCTACTTTTGCCATGCGGCCATCTGTAGCATGACTTGGGCGACCCGCATGGCAGAGCATACTTGTAGCCAGTCTAGGAGCTTTGGGTGGACCCATACCGACGCTTTCCATAGCCGCTGTTCTAGTTGCGGTACGACTTTGTCGTCGTTCTTCAGCGCTTTGACGCGCTTAAGTAGGTCGCACGCATGCTAGACCCGCGACTGCAAGCAGTCTTTCAACTGGACTCATGGAAGTCGCTACTTCTTCAATACGCAGACCGACTTTTGGACGCGTTTCCATACGGTTAGCGTTGCGGCCACAAGCTGCCACGCTTTCTTCGTCTTTAATTTCTCGACGACTTTGAACCGCTGGACGGCTGAAGGCCAGTCTAGGCGGACATGCTACCAGCGTGACCACTTGTCAAGCTCGCAGGCCATTGGCAACCAATGTACATGTACGACTTTGACTTGGTGGACCAGCTGCTGTTCTACGTGCGCGCAAGGTGGCCAAGAATGTCGGACCAATGAGTCGTCGGCGACCCACCATTCCGTGTCAAGCCACCAGTCGCAAAGCCCCTCTACCTTCACACCCGCGACCTTCGTATGCCGCGTCGTATGTGGGACGTCCTTTACGAGTGGCAATTCAGACTACTGCACTTGCCAGCATGGTTCTACATATTTTTGTAGCACCTGCCGTTGGTAGTCTACCTCGGCCCGTACGGTCTTAGGAAGTTGCATAACAACTTTCTCTAAGCAAGCGACCCATAGTTGTAGCTTGACCTTCTGCTCATT", minInsertSize: 0, insertDistn:[], hybridLength: 9, bubbleSizeLeft: 2, bubbleSizeRight: 1};




