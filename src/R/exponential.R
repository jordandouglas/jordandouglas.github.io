



png("F:/STOREDFILES/Research/OverprintingDisorder/Animations/bin/TutorialImages/exponential.png", width = 1000, height = 500, res = 120)

par(mfrow = c(1,2))

rate = 0.001
x = seq(from = 0, to = 4/rate, by = 0.1)
plot(x, dexp(x, rate ), main=paste("Exponential(k = ", rate, ")", sep = ""), type="n", xaxs = "i", yaxs = "i", xlab = "Reaction time (s)", ylab = "Probability density")
polygon(c(0, x, 2), c(0, dexp(x, rate ), 0), col = "#008CBA", border= "black")
axis(1)
axis(2)

rate = 0.002
plot(x, dexp(x, rate ),  main = paste("Exponential(k = ", rate, ")", sep = ""), type="n", xaxs = "i", yaxs = "i", xlab = "Reaction time (s)", ylab = "Probability density")
polygon(c(0, x, 4), c(0, dexp(x, rate ), 0), col = "#008CBA", border= "black")
axis(1)
axis(2)

dev.off()


