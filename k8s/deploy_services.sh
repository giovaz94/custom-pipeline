kubectl apply -f parser/parser.yaml
kubectl apply -f attachment-manager/attachment-manager.yaml
kubectl apply -f image-analyzer/image-analyzer.yaml
#kubectl apply -f image-recognizer/image-recognizer.yaml
kubectl apply -f virus-scanner/virus-scanner.yaml
kubectl apply -f message-analyzer/message-analyzer.yaml 
#kubectl apply -f gs-algorithm/gs-algorithm.yaml
#kubectl apply -f nsfw-detector/nsfw-detector.yaml
kubectl apply -f link-analyzer/link-analyzer.yaml 
kubectl apply -f text-analyzer/text-analyzer.yaml 
kubectl apply -f header-analyzer/header-analyzer.yaml 

