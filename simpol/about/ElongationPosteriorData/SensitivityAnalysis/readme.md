

## An earlier experiment used for the project described in "Bayesian inference and comparison of stochastic transcription elongation models."

https://doi.org/10.1101/499277




The posterior distributions in this folder demonstrate how the model posterior probability P(M|D) for T7 pol can change due to different prior distribtions. In the main results P(M5|D) ~ 1, while here P(M5|D) = 0.21 and P(M4|D) = 0.79.

In the experiments presented in this folder, the prior distribution for KD is more complex: it is conditionally dependent on whether NTP binding is assumed to achieve equilibrium or not. This results in two parameters (two instances) of KD where each instance is used by a different model. This two-instance approach was not used in the final publication due to its complexity, other than a mention to the model posterior probabilities in subsection "The data does not determine the kinetics of the NTP binding step".


Note that multiple-instance prior distributions cannot be visualised in the user interface and are only applicable when running through the command line.






