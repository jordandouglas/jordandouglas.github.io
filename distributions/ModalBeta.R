


x = seq(from = 0, to = 1, by = 0.01)
mu = 0.2
b = 

a = mu*b / (1-mu)




plot(x, dbeta(x, a, b), type = "l", yaxs = "i", xaxs = "i")


mu = 0.2
sigma = 0.288 # less than sqrt(1/12) = 0.2886


a = ( (1-mu)/sigma^2 - 1/mu) * mu^2
b = a * (1/mu - 1)

plot(x, dbeta(x, a, b), type = "l", yaxs = "i", xaxs = "i")




m = 0.05
sbeta = function(x, s) {
	b = exp(s)
	a = (m*(b-2) + 1) / (1-m)
	dbeta(x, a, b)
} 




#pdf("ModalBetaProposalKernel.pdf", width = 4, height = 4)

#png("ModalBetaProposalKernel.png", width = 600, height = 600, res = 100)


x = seq(from = 0, to = 1, by = 0.001)
S = c(0, 0.5, 2, 5, 8)
cols = c("black", "red", "green", "blue", "orange")

plot(x, sbeta(x, 6), type = "n", yaxs = "i", xaxs = "i", xlab = "x", ylab = "q(x'|x)", main = "Modal beta proposal kernel (mode = 0.2)")


for (i in 1:length(S)){
	lines(x, sbeta(x, S[i]), col = cols[i], lwd = 1.5)
}


legend("topright", paste0("s=", S), col = cols, lwd = 1.5)


#dev.off()



# Bactrian Beta
#png("BactrianBeta.png", width = 600, height = 600, res = 100)

#c1 = cen*m
#c2 = cen + (1-cen)*(1-m)

cen = 0.2
d = 0.08
m = 0.05
bactrianbeta = function(x, s, d) {
	b = exp(s)
	#d = 0.1
	c1 = cen^(1+d)
	c2 = cen^(1-d)
	a1 = (c1*(b-2) + 1) / (1-c1)
	a2 = (c2*(b-2) + 1) / (1-c2)
	0.5*dbeta(x, a1, b) + 0.5*dbeta(x, a2, b)
} 



k = 0.07
x = seq(from = 0, to = 1, by = 0.001)
S = c(0, 0.5, 3, 5, 6, 7)
D = exp(-S^2*k) / (exp(-S^2*k) + 1) #c(0, 0.1, 0.1, 0.05, 0.015)
cols = c("black", "red", "green", "blue", "orange", "grey")

plot(x, bactrianbeta(x, S[6], D[6]), type = "n", yaxs = "i", xaxs = "i", xlab = "x", ylab = "q(x'|x)", main = "Bactrian-beta proposal kernel (mode = 0.2)")


for (i in 1:length(S)){
	lines(x, bactrianbeta(x, S[i], D[i]), col = cols[i], lwd = 1.5)
}


legend("topright", paste0("s=", S), col = cols, lwd = 1.5)

#dev.off()
















