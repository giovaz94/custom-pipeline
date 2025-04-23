kubectl apply -f redis/
kubectl apply -f prometheus/
kubectl apply -f entrypoint/
kubectl apply -f roles/
kubectl apply -f parser/
kubectl apply -f attachment-manager/
kubectl apply -f image-analyzer/
kubectl apply -f virus-scanner/
kubectl apply -f message-analyzer/
#kubectl apply -f nsfw-detector/nsfw-detector.yaml
kubectl apply -f link-analyzer/link-analyzer.yaml 
kubectl apply -f text-analyzer/text-analyzer.yaml 
kubectl apply -f header-analyzer/header-analyzer.yaml 

